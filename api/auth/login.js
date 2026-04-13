import { connectDB } from '../../lib/db.js';
import { issueTokens, verifyPassword } from '../../lib/auth.js';
import { writeLog } from '../../lib/log.js';
import { applyCors, enforcePayloadLimit, rateLimit, sanitizeString } from '../../middleware/requestGuards.js';
import { sendError, fail } from '../../lib/errors.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'auth-login', limit: 60 });
    enforcePayloadLimit(req);
    await connectDB();

    if (req.method !== 'POST') throw fail('Method not allowed', 'validation_error', 405);

    const email = sanitizeString(req.body?.email || '').toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) throw fail('email and password are required', 'validation_error', 400);

    const user = await User.findOne({ email });
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await writeLog({ level: 'warn', action: 'auth.login.failed', path: req.url, request: { email } });
      throw fail('invalid credentials', 'validation_error', 401);
    }

    const { accessToken, refreshToken } = issueTokens(user);
    await writeLog({ action: 'auth.login', user_id: String(user._id), path: req.url });
    return res.status(200).json({ access_token: accessToken, refresh_token: refreshToken, user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (error) {
    return sendError(res, error);
  }
}
