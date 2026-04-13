import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import Log from '../models/Log.js';

export default async function handler(req, res) {
  await connectDB();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const query = user.role === 'admin' ? {} : { user_id: String(user._id) };
  const logs = await Log.find(query).sort({ createdAt: -1 }).limit(100);
  return res.status(200).json(logs);
}
