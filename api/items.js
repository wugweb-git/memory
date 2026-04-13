const { connectDB } = require('../lib/db');
const { hashRaw } = require('../lib/hash');
const Item = require('../models/Item');
const Health = require('../models/Health');

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
  if (type !== 'link') return 'active';

  try {
    const res = await fetch(raw, { method: 'GET' });
    return res.ok ? 'active' : 'broken';
  } catch {
    return 'broken';
  }
}

function stripHistory(item) {
  const out = item.toObject ? item.toObject() : item;
  if (out.versioning) delete out.versioning.previous_versions;
  return out;
}

module.exports = async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    const items = await Item.find()
      .select('-versioning.previous_versions')
      .sort({ 'origin.created_at': -1 })
      .limit(50);

    return res.status(200).json(items);
  }

  if (req.method === 'POST') {
    const { raw } = asJson(req.body);
    if (!raw) return res.status(400).json({ error: 'raw is required' });

    const type = isUrl(raw) ? 'link' : 'text';
    const url = type === 'link' ? raw.trim() : undefined;

    if (url) {
      const existing = await Item.findOne({ 'source.url': url });
      if (existing) {
        return res.status(200).json({ status: 'exists', item: stripHistory(existing) });
      }
    }

    const link_status = await linkStatusFor(raw, type);
    const item = await Item.create({
      content: { raw, type },
      source: { type: 'manual', url },
      origin: { created_at: new Date(), created_by: 'user' },
      sync: { last_synced_at: new Date(), has_changed: false, link_status },
      versioning: { current_hash: hashRaw(raw), previous_versions: [] }
    });

    if (link_status === 'broken') {
      await Health.create({ item_id: item._id, link_status: 'broken', checked_at: new Date() });
    }

    return res.status(201).json({ status: 'saved', item: stripHistory(item) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
