import { config } from '../config/config.js';
import { connectDB } from '../lib/db.js';
import { syncItem } from '../lib/sync.js';
import { handleEmail } from '../lib/email.js';
import { checkHealth } from '../lib/health.js';
import { signup, login, me, logout } from '../lib/authRoutes.js';
import { deleteItem, createItem, getItems } from '../lib/items.js';
import { createSource, getLogs, listSources, runSync } from '../lib/systemRoutes.js';
import { sendError, fail } from '../lib/errors.js';
import { applyCors, enforcePayloadLimit, rateLimit } from '../middleware/requestGuards.js';
import { writeLog } from '../lib/log.js';

function requestUrl(req) {
  return req.originalUrl || req.url;
}

function getPathname(req) {
  const parsed = new URL(requestUrl(req), 'http://localhost');
  return parsed.pathname.replace(/\/$/, '') || '/';
}

function getQuery(req) {
  const parsed = new URL(requestUrl(req), 'http://localhost');
  const query = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    query[key] = value;
  }
  return query;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const path = getPathname(req);
  req.query = req.query || getQuery(req);

  try {
    if (path === '/api' && req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        version: config.appVersion,
        endpoints: ['/api/test', '/api/auth/signup', '/api/auth/login', '/api/auth/me', '/api/auth/logout', '/api/items', '/api/sync', '/api/email', '/api/health', '/api/logs', '/api/sources', '/api/sync/run']
      });
    }

    if (path === '/api/test' && req.method === 'GET') {
      return res.status(200).json({ status: 'working' });
    }


    if (path === '/api/auth/signup' && req.method === 'POST') {
      await connectDB();
      rateLimit(req, { key: 'auth-signup', limit: 60 });
      enforcePayloadLimit(req);
      const result = await signup(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/auth/login' && req.method === 'POST') {
      await connectDB();
      rateLimit(req, { key: 'auth-login', limit: 120 });
      enforcePayloadLimit(req);
      const result = await login(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/auth/me' && req.method === 'GET') {
      await connectDB();
      rateLimit(req, { key: 'auth-me', limit: 180 });
      const result = await me(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/auth/logout' && req.method === 'POST') {
      rateLimit(req, { key: 'auth-logout', limit: 180 });
      const result = await logout(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/items' && req.method === 'GET') {
      await connectDB();
      rateLimit(req, { key: 'items', limit: 180 });
      const result = await getItems(req);
      return res.status(200).json(result);
    }

    if (path === '/api/items' && req.method === 'POST') {
      await connectDB();
      rateLimit(req, { key: 'items', limit: 180 });
      enforcePayloadLimit(req);
      const result = await createItem(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/items' && req.method === 'DELETE') {
      await connectDB();
      rateLimit(req, { key: 'items', limit: 180 });
      enforcePayloadLimit(req);
      const result = await deleteItem(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/sync' && req.method === 'POST') {
      await connectDB();
      rateLimit(req, { key: 'sync', limit: 180 });
      enforcePayloadLimit(req);
      const result = await syncItem(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/email' && req.method === 'POST') {
      await connectDB();
      rateLimit(req, { key: 'email', limit: 120 });
      enforcePayloadLimit(req);
      const result = await handleEmail(req);
      return res.status(result.code).json(result.body);
    }


    if (path === '/api/logs' && req.method === 'GET') {
      await connectDB();
      rateLimit(req, { key: 'logs', limit: 120 });
      const result = await getLogs(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/sources' && req.method === 'GET') {
      await connectDB();
      rateLimit(req, { key: 'sources', limit: 120 });
      const result = await listSources(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/sources' && req.method === 'POST') {
      await connectDB();
      rateLimit(req, { key: 'sources', limit: 120 });
      enforcePayloadLimit(req);
      const result = await createSource(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/sync/run' && req.method === 'POST') {
      await connectDB();
      rateLimit(req, { key: 'sync-run', limit: 60 });
      const result = await runSync(req);
      return res.status(result.code).json(result.body);
    }

    if (path === '/api/health' && req.method === 'GET') {
      await connectDB();
      rateLimit(req, { key: 'health', limit: 120 });
      const result = await checkHealth(req);
      return res.status(result.code).json(result.body);
    }

    throw fail('Not found', 'validation_error', 404);
  } catch (error) {
    await writeLog({ level: 'error', action: 'api.error', path: req.url, error: error.message });
    return sendError(res, error);
  }
}
