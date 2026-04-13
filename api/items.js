import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { writeLog } from '../lib/log.js';
import { hashRaw } from '../lib/hash.js';
import { getCache, setCache, clearCacheByPrefix } from '../lib/cache.js';
import { applyCors, enforcePayloadLimit, rateLimit, sanitizeString } from '../middleware/requestGuards.js';
import { fail, sendError, withRetry } from '../lib/errors.js';
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

function canEdit(item, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return item.owner?.user_id === String(user._id);
}

function mapFilters(req, user) {
  const { q = '', type = '', source = '', scope = 'my' } = req.query || {};
  const filter = { archived: { $ne: true } };
  if (q) filter['content.raw'] = { $regex: sanitizeString(q), $options: 'i' };
  if (type) filter['content.type'] = sanitizeString(type);
  if (source) filter['source.type'] = sanitizeString(source);

  if (scope === 'public') filter.visibility = 'public';
  else if (!(scope === 'all' && user?.role === 'admin')) filter['owner.user_id'] = String(user._id);

  return filter;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'items', limit: 180 });
    enforcePayloadLimit(req);
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);

    if (req.method === 'GET') {
      const page = Math.max(parseInt(req.query?.page || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query?.limit || '20', 10), 1), 50);
      const includeHistory = req.query?.includeHistory === 'true';
      const filter = mapFilters(req, user);

      const cacheKey = `items:${String(user._id)}:${JSON.stringify({ page, limit, filter, includeHistory })}`;
      const cached = getCache(cacheKey);
      if (cached) return res.status(200).json(cached);

      const query = Item.find(filter).sort({ 'origin.created_at': -1 }).skip((page - 1) * limit).limit(limit);
      if (!includeHistory) query.select('-versioning.previous_versions');
      const [items, total] = await Promise.all([query, Item.countDocuments(filter)]);
      const out = { items, total, page, limit, has_more: page * limit < total };
      setCache(cacheKey, out, 8000);
      return res.status(200).json(out);
    }

    if (req.method === 'POST') {
      const { raw, visibility = 'private', platform = '', external_id = '' } = req.body || {};
      if (!raw) throw fail('raw is required', 'validation_error', 400);

      const cleanedRaw = sanitizeString(raw);
      const type = isUrl(cleanedRaw) ? 'link' : 'text';
      const url = type === 'link' ? cleanedRaw.trim() : undefined;

      const duplicateFilter = {
        archived: { $ne: true },
        'owner.user_id': String(user._id),
        $or: [{ 'source.url': url || '__none__' }, { 'versioning.current_hash': hashRaw(cleanedRaw) }]
      };
      const existing = await Item.findOne(duplicateFilter);
      if (existing) {
        return res.status(200).json({
          status: 'exists',
          is_duplicate: true,
          existing_item_id: String(existing._id),
          item: existing
        });
      }

      const link = await linkStatusFor(cleanedRaw, type);
      const item = await Item.create({
        content: { raw: cleanedRaw, type },
        source: { type: 'manual', url, platform: sanitizeString(platform), external_id: sanitizeString(external_id) },
        owner: { user_id: String(user._id), email: user.email },
        visibility,
        origin: { created_at: new Date(), created_by: 'user' },
        sync: { last_synced_at: new Date(), has_changed: false, link_status: link.status, error_reason: link.reason, last_checked_at: new Date() },
        versioning: { current_hash: hashRaw(cleanedRaw), previous_versions: [] }
      });

      if (link.status === 'broken') {
        await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date(), error_reason: link.reason });
      }
      await Metric.create({ event: 'item_created', user_id: String(user._id), payload: { item_id: String(item._id) } });
      await writeLog({ action: 'items.create', user_id: String(user._id), path: req.url, response: { id: String(item._id) } });
      clearCacheByPrefix(`items:${String(user._id)}:`);

      return res.status(201).json({ status: 'saved', is_duplicate: false, item });
    }

    if (req.method === 'DELETE') {
      const { item_id } = req.body || {};
      if (!item_id) throw fail('item_id is required', 'validation_error', 400);

      const item = await Item.findById(item_id);
      if (!item) throw fail('item not found', 'validation_error', 404);
      if (!canEdit(item, user)) throw fail('forbidden', 'auth_error', 403);

      item.archived = true;
      await item.save();
      await writeLog({ action: 'items.archive', user_id: String(user._id), path: req.url, request: { item_id } });
      clearCacheByPrefix(`items:${String(user._id)}:`);
      return res.status(200).json({ status: 'deleted', archived: true, item_id });
    }

    throw fail('Method not allowed', 'validation_error', 405);
  } catch (error) {
    await writeLog({ level: 'error', action: 'items.error', path: req.url, error: error.message });
    return sendError(res, error);
  }
}
