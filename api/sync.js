import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { writeLog } from '../lib/log.js';
import { hashRaw } from '../lib/hash.js';
import Item from '../models/Item.js';
import Health from '../models/Health.js';

function asJson(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function isUrl(raw) {
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim());
}

async function linkStatusFor(url, contentType) {
  if (contentType !== 'link') return { status: 'active', reason: '' };

  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'broken', reason: error.message };
  }
}

function canEdit(item, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return item.owner?.user_id === String(user._id);
}

export default async function handler(req, res) {
  await connectDB();
  const user = await getAuthUser(req);

  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { item_id, raw, url, external_id, platform } = asJson(req.body);
    if (!raw) return res.status(400).json({ error: 'raw is required' });

    const rawIsUrl = isUrl(raw);
    const resolvedUrl = url || (rawIsUrl ? raw.trim() : undefined);
    const contentType = resolvedUrl ? 'link' : 'text';
    const nextHash = hashRaw(raw);

    const find = [];
    if (item_id) find.push({ _id: item_id });
    if (external_id) find.push({ 'source.external_id': external_id, 'owner.user_id': String(user._id) });
    if (resolvedUrl) find.push({ 'source.url': resolvedUrl, 'owner.user_id': String(user._id) });
    if (find.length === 0) return res.status(400).json({ error: 'item_id or url or external_id is required' });

    let item = await Item.findOne({ $or: find });
    const link = await linkStatusFor(resolvedUrl, contentType);

    if (!item) {
      item = await Item.create({
        content: { raw, type: contentType },
        source: { type: 'api', platform, url: resolvedUrl, external_id },
        owner: { user_id: String(user._id), email: user.email },
        visibility: 'private',
        origin: { created_at: new Date(), created_by: 'system' },
        sync: { last_synced_at: new Date(), has_changed: false, link_status: link.status, error_reason: link.reason },
        versioning: { current_hash: nextHash, previous_versions: [] }
      });

      if (link.status === 'broken') {
        await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date(), error_reason: link.reason });
      }

      await writeLog({ action: 'sync.create', user_id: String(user._id), path: req.url, request: req.body, response: { id: String(item._id) } });
      return res.status(201).json(item);
    }

    if (!canEdit(item, user)) return res.status(403).json({ error: 'forbidden' });

    const changed = item.versioning.current_hash !== nextHash;
    if (changed) {
      item.versioning.previous_versions.push({ raw: item.content.raw, timestamp: new Date() });
      item.content.raw = raw;
      item.content.type = contentType;
      item.versioning.current_hash = nextHash;
      item.sync.has_changed = true;
    } else {
      item.sync.has_changed = false;
    }

    item.source.type = 'api';
    item.source.platform = platform || item.source.platform;
    item.source.url = resolvedUrl || item.source.url;
    item.source.external_id = external_id || item.source.external_id;
    item.sync.last_synced_at = new Date();
    item.sync.link_status = link.status;
    item.sync.error_reason = link.reason;

    await item.save();

    if (link.status === 'broken') {
      await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date(), error_reason: link.reason });
    }

    await writeLog({ action: 'sync.update', user_id: String(user._id), path: req.url, request: req.body, response: { id: String(item._id), changed } });
    return res.status(200).json(item);
  } catch (error) {
    await writeLog({ level: 'error', action: 'sync.error', user_id: String(user._id), path: req.url, error: error.message });
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}
