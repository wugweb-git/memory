import { config } from '../config/config.js';
import { connectDB } from '../lib/db.js';
import { syncItem } from '../lib/sync.js';
import { handleEmail } from '../lib/email.js';
import { checkHealth } from '../lib/health.js';
import { signup, login, me, logout } from '../lib/authRoutes.js';
import { deleteItem, createItem, getItems } from '../lib/items.js';
import { createSource, getLogs, listSources, runSync } from '../lib/systemRoutes.js';
import { checkStorage } from '../lib/storageCheck.js';
import { fetchPrivateBlob, uploadPrivateBlob } from '../lib/blob.js';
import { sendError, fail } from '../lib/errors.js';
import { applyCors, enforcePayloadLimit, rateLimit } from '../middleware/requestGuards.js';
import { writeLog } from '../lib/log.js';

function requestUrl(req) { return req.originalUrl || req.url; }
function getPathname(req) { const parsed = new URL(requestUrl(req), 'http://localhost'); return parsed.pathname.replace(/\/$/, '') || '/'; }
function getQuery(req) { const parsed = new URL(requestUrl(req), 'http://localhost'); return Object.fromEntries(parsed.searchParams.entries()); }

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const path = getPathname(req);
  req.query = req.query || getQuery(req);

  try {
    await connectDB();

    if (path === '/api' && req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        version: config.appVersion,
        endpoints: ['/api/test', '/api/test-db', '/api/test-storage', '/api/avatar/upload', '/api/avatar/view', '/api/auth/signup', '/api/auth/login', '/api/auth/me', '/api/auth/logout', '/api/items', '/api/sync', '/api/email', '/api/health', '/api/logs', '/api/sources', '/api/sync/run']
      });
    }

    if (path === '/api/test' && req.method === 'GET') return res.status(200).json({ status: 'working' });
    if (path === '/api/avatar/upload' && req.method === 'POST') return res.status(200).json(await uploadPrivateBlob(req));
    if (path === '/api/avatar/view' && req.method === 'GET') {
      const pathname = new URL(requestUrl(req), 'http://localhost').searchParams.get('pathname');
      const result = await fetchPrivateBlob(pathname);
      return res.redirect(result.downloadUrl);
    }
    if (path === '/api/test-db' && req.method === 'GET') return res.status(200).json(await checkStorage());
    if (path === '/api/test-storage' && req.method === 'GET') return res.status(200).json(await checkStorage());

    if (path === '/api/auth/signup' && req.method === 'POST') { rateLimit(req, { key: 'auth-signup', limit: 60 }); enforcePayloadLimit(req); const r = await signup(req); return res.status(r.code).json(r.body); }
    if (path === '/api/auth/login' && req.method === 'POST') { rateLimit(req, { key: 'auth-login', limit: 120 }); enforcePayloadLimit(req); const r = await login(req); return res.status(r.code).json(r.body); }
    if (path === '/api/auth/me' && req.method === 'GET') { rateLimit(req, { key: 'auth-me', limit: 180 }); const r = await me(req); return res.status(r.code).json(r.body); }
    if (path === '/api/auth/logout' && req.method === 'POST') { rateLimit(req, { key: 'auth-logout', limit: 180 }); const r = await logout(req); return res.status(r.code).json(r.body); }

    if (path === '/api/items' && req.method === 'GET') { rateLimit(req, { key: 'items', limit: 180 }); return res.status(200).json(await getItems(req)); }
    if (path === '/api/items' && req.method === 'POST') { rateLimit(req, { key: 'items', limit: 180 }); enforcePayloadLimit(req); const r = await createItem(req); return res.status(r.code).json(r.body); }
    if (path === '/api/items' && req.method === 'DELETE') { rateLimit(req, { key: 'items', limit: 180 }); enforcePayloadLimit(req); const r = await deleteItem(req); return res.status(r.code).json(r.body); }

    if (path === '/api/sync' && req.method === 'POST') { rateLimit(req, { key: 'sync', limit: 180 }); enforcePayloadLimit(req); const r = await syncItem(req); return res.status(r.code).json(r.body); }
    if (path === '/api/email' && req.method === 'POST') { rateLimit(req, { key: 'email', limit: 120 }); enforcePayloadLimit(req); const r = await handleEmail(req); return res.status(r.code).json(r.body); }

    if (path === '/api/logs' && req.method === 'GET') { rateLimit(req, { key: 'logs', limit: 120 }); const r = await getLogs(req); return res.status(r.code).json(r.body); }
    if (path === '/api/sources' && req.method === 'GET') { rateLimit(req, { key: 'sources', limit: 120 }); const r = await listSources(req); return res.status(r.code).json(r.body); }
    if (path === '/api/sources' && req.method === 'POST') { rateLimit(req, { key: 'sources', limit: 120 }); enforcePayloadLimit(req); const r = await createSource(req); return res.status(r.code).json(r.body); }
    if (path === '/api/sync/run' && req.method === 'POST') { rateLimit(req, { key: 'sync-run', limit: 60 }); const r = await runSync(req); return res.status(r.code).json(r.body); }
    if (path === '/api/health' && req.method === 'GET') { rateLimit(req, { key: 'health', limit: 120 }); const r = await checkHealth(req); return res.status(r.code).json(r.body); }

    throw fail('Not found', 'validation_error', 404);
  } catch (error) {
    await writeLog({ level: 'error', action: 'api.error', path: req.url, error: error.message });
    return sendError(res, error);
  }
}
