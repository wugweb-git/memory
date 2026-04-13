import { getAuthUser } from './auth.js';
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

async function linkStatusFor(url, contentType) {
  if (contentType !== 'link') return { status: 'active', reason: '' };
  return withRetry(async () => {
    const response = await fetch(url, { method: 'GET' });
    return response.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${response.status}` };
  }, 2, 250).catch((error) => ({ status: 'broken', reason: error.message }));
}

function canEdit(item, user) {
  if (user.role === 'admin') return true;
  return item.owner?.user_id === String(user._id);
}

export async function syncItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { item_id, raw, url, external_id, platform } = req.body || {};
  if (!raw) throw fail('raw is required', 'validation_error', 400);

  const cleanRaw = sanitizeString(raw);
  const rawIsUrl = isUrl(cleanRaw);
  const resolvedUrl = url || (rawIsUrl ? cleanRaw.trim() : undefined);
  const contentType = resolvedUrl ? 'link' : 'text';
  const nextHash = hashRaw(cleanRaw);

  const filters = [];
  if (item_id) filters.push({ _id: item_id });
  if (external_id) filters.push({ 'source.external_id': sanitizeString(external_id), 'owner.user_id': String(user._id) });
  if (resolvedUrl) filters.push({ 'source.url': resolvedUrl, 'owner.user_id': String(user._id) });
  if (!filters.length) throw fail('item_id or url or external_id is required', 'validation_error', 400);

  let item = await Item.findOne({ $or: filters, archived: { $ne: true } });
  const link = await linkStatusFor(resolvedUrl, contentType);

  if (!item) {
    item = await Item.create({
      content: { raw: cleanRaw, type: contentType },
      source: { type: 'api', platform: sanitizeString(platform || ''), url: resolvedUrl, external_id: sanitizeString(external_id || '') },
      owner: { user_id: String(user._id), email: user.email },
      visibility: 'private',
      origin: { created_at: new Date(), created_by: 'system' },
      sync: {
        last_synced_at: new Date(),
        has_changed: false,
        link_status: link.status,
        error_reason: link.reason,
        last_checked_at: new Date()
      },
      versioning: { current_hash: nextHash, previous_versions: [] }
    });

    await Metric.create({ event: 'sync_triggered', user_id: String(user._id), payload: { created: true, item_id: String(item._id) } });
    return { code: 201, body: item };
  }

  if (!canEdit(item, user)) throw fail('forbidden', 'auth_error', 403);

  const changed = item.versioning.current_hash !== nextHash;
  if (changed) {
    item.versioning.previous_versions.push({ raw: item.content.raw, timestamp: new Date() });
    item.content.raw = cleanRaw;
    item.content.type = contentType;
    item.versioning.current_hash = nextHash;
    item.sync.has_changed = true;
    await Metric.create({ event: 'item_updated', user_id: String(user._id), payload: { item_id: String(item._id) } });
  } else {
    item.sync.has_changed = false;
  }

  item.source.type = 'api';
  item.source.platform = sanitizeString(platform || item.source.platform || '');
  item.source.url = resolvedUrl || item.source.url;
  item.source.external_id = sanitizeString(external_id || item.source.external_id || '');
  item.sync.last_synced_at = new Date();
  item.sync.link_status = link.status;
  item.sync.error_reason = link.reason;
  item.sync.last_checked_at = new Date();

  await item.save();

  if (link.status === 'broken') {
    await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date(), error_reason: link.reason });
  }

  await writeLog({ action: 'sync.update', user_id: String(user._id), path: req.url, response: { id: String(item._id), changed } });
  await Metric.create({ event: 'sync_triggered', user_id: String(user._id), payload: { created: false, item_id: String(item._id) } });

  return { code: 200, body: item };
}
