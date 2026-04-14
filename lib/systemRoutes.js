import { fail } from './errors.js';
import { getAuthUser } from './auth.js';
import { runAllJobsOnce } from './jobs.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import { listLogs } from './log.js';
import { createBaseDoc, readStore, updateStore } from './store.js';

export async function getLogs(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || '50', 10), 1), 200);
  return { code: 200, body: await listLogs(limit, String(user._id), user.role === 'admin') };
}

export async function listSources(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const store = await readStore();
  return { code: 200, body: store.sources.filter((s) => s.user_id === String(user._id)) };
}

export async function createSource(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const type = sanitizeString(req.body?.type || 'rss');
  const url = sanitizeString(req.body?.url || '');
  if (!url) throw fail('url is required', 'validation_error', 400);

  let source;
  await updateStore((store) => {
    source = store.sources.find((s) => s.user_id === String(user._id) && s.type === type && s.url === url);
    if (!source) {
      source = createBaseDoc('src', { user_id: String(user._id), type, url, status: 'idle' });
      store.sources.push(source);
    }
  });

  return { code: 201, body: source };
}

export async function runSync(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const result = await runAllJobsOnce();
  return { code: 200, body: { ...result, last_global_sync: new Date().toISOString() } };
}
