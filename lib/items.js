import { getAuthUser } from './auth.js';
import { getCache, setCache, clearCacheByPrefix } from './cache.js';
import { fail, withRetry } from './errors.js';
import { hashRaw } from './hash.js';
import { writeLog } from './log.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import Item from '../models/Item.js';
import Health from '../models/Health.js';
import Metric from '../models/Metric.js';

function isUrl(raw) {
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim());
}

async function linkStatusFor(raw, type) {
  if (type !== 'link') return { status: 'active', reason: '' };
  return withRetry(async () => {
    const response = await fetch(raw, { method: 'GET' });
    return response.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${response.status}` };
  }, 2, 250).catch((error) => ({ status: 'broken', reason: error.message }));
}

function mapFilters(query, user) {
  const { q = '', type = '', source = '', scope = 'my' } = query || {};
  const filter = { archived: { $ne: true } };
  if (q) filter['content.raw'] = { $regex: sanitizeString(q), $options: 'i' };
  if (type) filter['content.type'] = sanitizeString(type);
  if (source) filter['source.type'] = sanitizeString(source);

  if (scope === 'public') {
    filter.visibility = 'public';
  } else if (scope === 'all' && user?.role === 'admin') {
    // admin can fetch all
  } else if (user?._id) {
    filter['owner.user_id'] = String(user._id);
  }

  return filter;
}

export async function getItems(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const page = Math.max(parseInt(req.query?.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || '20', 10), 1), 50);
  const includeHistory = req.query?.includeHistory === 'true';
  const filter = mapFilters(req.query, user);

  const cacheKey = `items:${String(user._id)}:${JSON.stringify({ page, limit, filter, includeHistory })}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const query = Item.find(filter).sort({ 'origin.created_at': -1 }).skip((page - 1) * limit).limit(limit);
  if (!includeHistory) query.select('-versioning.previous_versions');

  const [items, total] = await Promise.all([query, Item.countDocuments(filter)]);
  const payload = { items, total, page, limit, has_more: page * limit < total };
  setCache(cacheKey, payload, 8000);
  return payload;
}

export async function createItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { raw, visibility = 'private', platform = '', external_id = '' } = req.body || {};
  if (!raw) throw fail('raw is required', 'validation_error', 400);

  const cleanedRaw = sanitizeString(raw);
  const type = isUrl(cleanedRaw) ? 'link' : 'text';
  const url = type === 'link' ? cleanedRaw.trim() : undefined;
  const hashed = hashRaw(cleanedRaw);

  const duplicateFilter = {
    archived: { $ne: true },
    'owner.user_id': String(user._id),
    $or: [{ 'source.url': url || '__none__' }, { 'versioning.current_hash': hashed }]
  };
  const existing = await Item.findOne(duplicateFilter);
  if (existing) {
    return {
      code: 200,
      body: { status: 'exists', is_duplicate: true, existing_item_id: String(existing._id), item: existing }
    };
  }

  const link = await linkStatusFor(cleanedRaw, type);
  const item = await Item.create({
    content: { raw: cleanedRaw, type },
    source: { type: 'manual', url, platform: sanitizeString(platform), external_id: sanitizeString(external_id) },
    owner: { user_id: String(user._id), email: user.email },
    visibility,
    origin: { created_at: new Date(), created_by: 'user' },
    sync: {
      last_synced_at: new Date(),
      has_changed: false,
      link_status: link.status,
      error_reason: link.reason,
      last_checked_at: new Date()
    },
    versioning: { current_hash: hashed, previous_versions: [] }
  });

  if (link.status === 'broken') {
    await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date(), error_reason: link.reason });
  }

  await Metric.create({ event: 'item_created', user_id: String(user._id), payload: { item_id: String(item._id) } });
  await writeLog({ action: 'items.create', user_id: String(user._id), path: req.url, response: { id: String(item._id) } });
  clearCacheByPrefix(`items:${String(user._id)}:`);

  return { code: 201, body: { status: 'saved', is_duplicate: false, item } };
}
