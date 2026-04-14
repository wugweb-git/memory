import { connectDB } from '../lib/db.js';
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
  if (contentType !== 'link') return 'active';

  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok ? 'active' : 'broken';
  } catch {
    return 'broken';
  }
}

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { item_id, raw, url, external_id, platform } = asJson(req.body);
  if (!raw) return res.status(400).json({ error: 'raw is required' });

  const rawIsUrl = isUrl(raw);
  const resolvedUrl = url || (rawIsUrl ? raw.trim() : undefined);
  const contentType = resolvedUrl ? 'link' : 'text';
  const nextHash = hashRaw(raw);

  const find = [];
  if (item_id) find.push({ _id: item_id });
  if (external_id) find.push({ 'source.external_id': external_id });
  if (resolvedUrl) find.push({ 'source.url': resolvedUrl });
  if (find.length === 0) return res.status(400).json({ error: 'item_id or url or external_id is required' });

  let item = await Item.findOne({ $or: find });
  const link_status = await linkStatusFor(resolvedUrl, contentType);

  if (!item) {
    item = await Item.create({
      content: { raw, type: contentType },
      source: { type: 'api', platform, url: resolvedUrl, external_id },
      origin: { created_at: new Date(), created_by: 'system' },
      sync: { last_synced_at: new Date(), has_changed: false, link_status },
      versioning: { current_hash: nextHash, previous_versions: [] }
    });

    if (link_status === 'broken') {
      await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date() });
    }

    return res.status(201).json(item);
  }

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
  item.sync.link_status = link_status;

  await item.save();

  if (link_status === 'broken') {
    await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date() });
  }

  return res.status(200).json(item);
};
