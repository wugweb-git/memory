import { connectDB } from '../../lib/db.js';
import { hashPassword, issueToken } from '../../lib/auth.js';
import { writeLog } from '../../lib/log.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  try {
    const user = await User.create({ email: String(email).toLowerCase(), password_hash: hashPassword(password), role: 'user' });
    const token = issueToken(user);
    await writeLog({ action: 'auth.signup', user_id: String(user._id), path: req.url, response: { ok: true } });
    return res.status(201).json({ token, user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (error) {
    await writeLog({ level: 'error', action: 'auth.signup', path: req.url, error: error.message });
    if (error.code === 11000) return res.status(409).json({ error: 'email already exists' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
