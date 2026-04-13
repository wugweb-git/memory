import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { applyCors, rateLimit } from '../middleware/requestGuards.js';
import { fail, sendError } from '../lib/errors.js';
import Log from '../models/Log.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'logs', limit: 120 });
    await connectDB();
    if (req.method !== 'GET') throw fail('Method not allowed', 'validation_error', 405);

    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);

    const query = user.role === 'admin' ? {} : { user_id: String(user._id) };
    const logs = await Log.find(query).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json(logs);
  } catch (error) {
    return sendError(res, error);
  }
}
