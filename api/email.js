import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { writeLog } from '../lib/log.js';
import { hashRaw } from '../lib/hash.js';
import { applyCors, enforcePayloadLimit, rateLimit, sanitizeString } from '../middleware/requestGuards.js';
import { fail, sendError } from '../lib/errors.js';
import Item from '../models/Item.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'email', limit: 120 });
    enforcePayloadLimit(req);
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);
    if (req.method !== 'POST') throw fail('Method not allowed', 'validation_error', 405);

    const subject = sanitizeString(req.body?.subject || '');
    const body = sanitizeString(req.body?.body || '');
    const from = sanitizeString(req.body?.from || '');
    const platform = sanitizeString(req.body?.platform || 'email');
    const raw = `${subject}\n\n${body}`.trim();
    if (!raw) throw fail('subject or body is required', 'validation_error', 400);

    const item = await Item.create({
      content: { raw, type: 'email' },
      source: { type: 'email', platform, external_id: from },
      owner: { user_id: String(user._id), email: user.email },
      visibility: 'private',
      origin: { created_at: new Date(), created_by: 'system' },
      sync: { last_synced_at: new Date(), has_changed: false, link_status: 'active', error_reason: '' },
      versioning: { current_hash: hashRaw(raw), previous_versions: [] }
    });

    await writeLog({ action: 'email.create', user_id: String(user._id), path: req.url, response: { id: String(item._id) } });
    return res.status(201).json(item);
  } catch (error) {
    await writeLog({ level: 'error', action: 'email.error', path: req.url, error: error.message });
    return sendError(res, error);
  }
}
