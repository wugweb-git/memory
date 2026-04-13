import { connectDB } from '../../lib/db.js';
import { getAuthUser, hashPassword, issueToken } from '../../lib/auth.js';
import { writeLog } from '../../lib/log.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || user.password_hash !== hashPassword(password)) {
    await writeLog({ level: 'warn', action: 'auth.login.failed', path: req.url, request: { email } });
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const token = issueToken(user);
  await writeLog({ action: 'auth.login', user_id: String(user._id), path: req.url, response: { ok: true } });
  return res.status(200).json({ token, user: { id: String(user._id), email: user.email, role: user.role } });
}
