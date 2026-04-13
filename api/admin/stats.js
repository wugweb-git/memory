import { connectDB } from '../../lib/db.js';
import { getAuthUser } from '../../lib/auth.js';
import { sendError, fail } from '../../lib/errors.js';
import Item from '../../models/Item.js';
import User from '../../models/User.js';
import Metric from '../../models/Metric.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') throw fail('forbidden', 'auth_error', 403);
    if (req.method !== 'GET') throw fail('Method not allowed', 'validation_error', 405);

    const [totalItems, activeUsers, syncSuccess] = await Promise.all([
      Item.countDocuments({ archived: { $ne: true } }),
      User.countDocuments(),
      Metric.countDocuments({ event: 'sync_triggered' })
    ]);

    return res.status(200).json({ total_items: totalItems, active_users: activeUsers, sync_success_rate: syncSuccess });
  } catch (error) {
    return sendError(res, error);
  }
}
