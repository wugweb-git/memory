import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { applyCors, enforcePayloadLimit, rateLimit, sanitizeString } from '../middleware/requestGuards.js';
import { sendError, fail } from '../lib/errors.js';
import Source from '../models/Source.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'sources', limit: 120 });
    enforcePayloadLimit(req);
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);

    if (req.method === 'GET') {
      const rows = await Source.find({ user_id: String(user._id) }).sort({ createdAt: -1 });
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const type = sanitizeString(req.body?.type || '');
      const url = sanitizeString(req.body?.url || '');
      if (!['rss', 'email'].includes(type) || !url) throw fail('type and url are required', 'validation_error', 400);
      const row = await Source.findOneAndUpdate(
        { user_id: String(user._id), type, url },
        { $set: { type, url, user_id: String(user._id), status: 'connected' } },
        { upsert: true, new: true }
      );
      return res.status(201).json(row);
    }

    throw fail('Method not allowed', 'validation_error', 405);
  } catch (error) {
    return sendError(res, error);
  }
}
