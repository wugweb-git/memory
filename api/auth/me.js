import { connectDB } from '../../lib/db.js';
import { getAuthUser } from '../../lib/auth.js';

export default async function handler(req, res) {
  await connectDB();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  return res.status(200).json({ user: { id: String(user._id), email: user.email, role: user.role } });
}
