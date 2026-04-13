import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { writeLog } from '../lib/log.js';
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
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { subject = '', body = '', from = '', platform = 'email' } = asJson(req.body);
    const raw = `${subject}\n\n${body}`.trim();

    if (!raw) return res.status(400).json({ error: 'subject or body is required' });

    const item = await Item.create({
      content: { raw, type: 'email' },
      source: { type: 'email', platform, external_id: from },
      owner: { user_id: String(user._id), email: user.email },
      visibility: 'private',
      origin: { created_at: new Date(), created_by: 'system' },
      sync: { last_synced_at: new Date(), has_changed: false, link_status: 'active', error_reason: '' },
      versioning: { current_hash: hashRaw(raw), previous_versions: [] }
    });

    await writeLog({ action: 'email.create', user_id: String(user._id), path: req.url, request: req.body, response: { id: String(item._id) } });
    return res.status(201).json(item);
  } catch (error) {
    await writeLog({ level: 'error', action: 'email.error', user_id: String(user._id), path: req.url, error: error.message });
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}
