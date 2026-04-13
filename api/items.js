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

async function linkStatusFor(raw, type) {
  if (type !== 'link') return { status: 'active', reason: '' };

  try {
    const response = await fetch(raw, { method: 'GET' });
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

function mapFilters(req, user) {
  const { q = '', type = '', source = '', scope = 'my' } = req.query || {};
  const filter = { archived: { $ne: true } };

  if (q) filter['content.raw'] = { $regex: q, $options: 'i' };
  if (type) filter['content.type'] = type;
  if (source) filter['source.type'] = source;

  if (scope === 'public') {
    filter.visibility = 'public';
  } else if (scope === 'all' && user?.role === 'admin') {
    // no extra filter
  } else {
    filter['owner.user_id'] = user ? String(user._id) : '__none__';
  }

  return filter;
}

export default async function handler(req, res) {
  await connectDB();
  const user = await getAuthUser(req);

  try {
    if (req.method === 'GET') {
      if (!user) return res.status(401).json({ error: 'unauthorized' });

      const page = Math.max(parseInt(req.query?.page || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query?.limit || '20', 10), 1), 50);
      const includeHistory = req.query?.includeHistory === 'true';
      const filter = mapFilters(req, user);

      const query = Item.find(filter)
        .sort({ 'origin.created_at': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      if (!includeHistory) query.select('-versioning.previous_versions');

      const [items, total] = await Promise.all([query, Item.countDocuments(filter)]);
      return res.status(200).json({ items, total, page, limit, has_more: page * limit < total });
    }

    if (req.method === 'POST') {
      if (!user) return res.status(401).json({ error: 'unauthorized' });

      const payload = asJson(req.body);
      const { raw, visibility = 'private', platform, external_id } = payload;
      if (!raw) return res.status(400).json({ error: 'raw is required' });

      const type = isUrl(raw) ? 'link' : 'text';
      const url = type === 'link' ? raw.trim() : undefined;

      if (url) {
        const existing = await Item.findOne({ 'source.url': url, 'owner.user_id': String(user._id), archived: { $ne: true } });
        if (existing) {
          await writeLog({ action: 'items.duplicate', user_id: String(user._id), path: req.url, request: payload });
          return res.status(200).json({ status: 'exists', item: existing });
        }
      }

      const link = await linkStatusFor(raw, type);
      const item = await Item.create({
        content: { raw, type },
        source: { type: 'manual', url, platform, external_id },
        owner: { user_id: String(user._id), email: user.email },
        visibility,
        origin: { created_at: new Date(), created_by: 'user' },
        sync: { last_synced_at: new Date(), has_changed: false, link_status: link.status, error_reason: link.reason },
        versioning: { current_hash: hashRaw(raw), previous_versions: [] }
      });

      if (link.status === 'broken') {
        await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date(), error_reason: link.reason });
      }

      await writeLog({ action: 'items.create', user_id: String(user._id), path: req.url, request: payload, response: { id: String(item._id) } });
      return res.status(201).json({ status: 'saved', item });
    }

    if (req.method === 'DELETE') {
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      const { item_id } = asJson(req.body);
      if (!item_id) return res.status(400).json({ error: 'item_id is required' });

      const item = await Item.findById(item_id);
      if (!item) return res.status(404).json({ error: 'item not found' });
      if (!canEdit(item, user)) return res.status(403).json({ error: 'forbidden' });

      item.archived = true;
      await item.save();
      await writeLog({ action: 'items.archive', user_id: String(user._id), path: req.url, request: { item_id } });
      return res.status(200).json({ status: 'deleted', archived: true, item_id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    await writeLog({ level: 'error', action: 'items.error', user_id: user ? String(user._id) : '', path: req.url, error: error.message });
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}
