import { connectDB } from '../../lib/db.js';
import { getAuthUser } from '../../lib/auth.js';
import { applyCors, rateLimit } from '../../middleware/requestGuards.js';
import { sendError, fail } from '../../lib/errors.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'auth-me', limit: 180 });
    await connectDB();
    if (req.method !== 'GET') throw fail('Method not allowed', 'validation_error', 405);

    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);

    return res.status(200).json({ user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (error) {
    return sendError(res, error);
  }
}
