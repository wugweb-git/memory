import { connectDB } from '../../lib/db.js';
import { getAuthUser } from '../../lib/auth.js';
import { runAllJobsOnce } from '../../lib/jobs.js';
import { sendError, fail } from '../../lib/errors.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);
    if (req.method !== 'POST') throw fail('Method not allowed', 'validation_error', 405);

    const result = await runAllJobsOnce();
    return res.status(200).json({ ok: true, result, last_global_sync: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error);
  }
}
