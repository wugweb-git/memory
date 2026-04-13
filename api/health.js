import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { applyCors, rateLimit } from '../middleware/requestGuards.js';
import { fail, sendError } from '../lib/errors.js';
import Item from '../models/Item.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'health', limit: 120 });
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);
    if (req.method !== 'GET') throw fail('Method not allowed', 'validation_error', 405);

    const query = { 'sync.link_status': 'broken', archived: { $ne: true } };
    if (user.role !== 'admin') query['owner.user_id'] = String(user._id);

    const broken = await Item.find(query)
      .sort({ 'origin.created_at': -1 })
      .limit(50)
      .select('content.raw content.type source.url owner visibility sync.link_status sync.error_reason sync.last_checked_at sync.last_synced_at');

    return res.status(200).json(broken);
  } catch (error) {
    return sendError(res, error);
  }
}
