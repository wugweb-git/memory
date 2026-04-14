import { connectDB } from '../lib/db.js';
import { hashRaw } from '../lib/hash.js';
import Item from '../models/Item.js';

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

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject = '', body = '', from = '' } = asJson(req.body);
  const raw = `${subject}\n\n${body}`.trim();

  if (!raw) {
    return res.status(400).json({ error: 'subject or body is required' });
  }

  const item = await Item.create({
    content: { raw, type: 'text' },
    source: { type: 'email', platform: 'email', external_id: from },
    origin: { created_at: new Date(), created_by: 'system' },
    sync: { last_synced_at: new Date(), has_changed: false, link_status: 'active' },
    versioning: { current_hash: hashRaw(raw), previous_versions: [] }
  });

  return res.status(201).json(item);
};
