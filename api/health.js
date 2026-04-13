import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import Item from '../models/Item.js';

export default async function handler(req, res) {
  await connectDB();
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const query = { 'sync.link_status': 'broken', archived: { $ne: true } };
  if (user.role !== 'admin') query['owner.user_id'] = String(user._id);

  const broken = await Item.find(query)
    .sort({ 'origin.created_at': -1 })
    .limit(50)
    .select('content.raw source.url owner visibility sync.link_status sync.error_reason sync.last_synced_at');

  return res.status(200).json(broken);
}
