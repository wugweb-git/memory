import { connectDB } from '../../lib/db.js';
import { getAuthUser } from '../../lib/auth.js';
import { runBackup } from '../../scripts/backup.js';
import { sendError, fail } from '../../lib/errors.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') throw fail('forbidden', 'auth_error', 403);
    if (req.method !== 'POST') throw fail('Method not allowed', 'validation_error', 405);

    const result = await runBackup();
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error);
  }
}
