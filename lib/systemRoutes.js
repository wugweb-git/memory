import { fail } from './errors.js';
import { getAuthUser } from './auth.js';
import { runAllJobsOnce } from './jobs.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import Source from '../models/Source.js';
import Log from '../models/Log.js';

export async function getLogs(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const limit = Math.min(Math.max(parseInt(req.query?.limit || '50', 10), 1), 200);
  const query = user.role === 'admin' ? {} : { $or: [{ user_id: String(user._id) }, { user_id: { $exists: false } }] };
  const rows = await Log.find(query).sort({ createdAt: -1 }).limit(limit);
  return { code: 200, body: rows };
}

export async function listSources(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const rows = await Source.find({ user_id: String(user._id) }).sort({ createdAt: -1 });
  return { code: 200, body: rows };
}

export async function createSource(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const type = sanitizeString(req.body?.type || 'rss');
  const url = sanitizeString(req.body?.url || '');
  if (!url) throw fail('url is required', 'validation_error', 400);

  const source = await Source.findOneAndUpdate(
    { user_id: String(user._id), type, url },
    { $setOnInsert: { user_id: String(user._id), type, url, status: 'idle' } },
    { new: true, upsert: true }
  );

  return { code: 201, body: source };
}

export async function runSync(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const result = await runAllJobsOnce();
  return { code: 200, body: { ...result, last_global_sync: new Date().toISOString() } };
}
