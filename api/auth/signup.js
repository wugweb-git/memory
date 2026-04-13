import { connectDB } from '../../lib/db.js';
import { hashPassword, issueTokens } from '../../lib/auth.js';
import { writeLog } from '../../lib/log.js';
import { applyCors, enforcePayloadLimit, rateLimit, sanitizeString } from '../../middleware/requestGuards.js';
import { sendError, fail } from '../../lib/errors.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    rateLimit(req, { key: 'auth-signup', limit: 30 });
    enforcePayloadLimit(req);
    await connectDB();

    if (req.method !== 'POST') throw fail('Method not allowed', 'validation_error', 405);

    const email = sanitizeString(req.body?.email || '').toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || password.length < 8) throw fail('email and password(>=8) are required', 'validation_error', 400);

    const user = await User.create({ email, password_hash: await hashPassword(password), role: 'user' });
    const { accessToken, refreshToken } = issueTokens(user);
    await writeLog({ action: 'auth.signup', user_id: String(user._id), path: req.url });
    return res.status(201).json({ access_token: accessToken, refresh_token: refreshToken, user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (error) {
    await writeLog({ level: 'error', action: 'auth.signup.error', path: req.url, error: error.message });
    if (error.code === 11000) return sendError(res, fail('email already exists', 'validation_error', 409));
    return sendError(res, error);
  }
}
