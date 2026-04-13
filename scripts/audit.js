import fs from 'fs/promises';
import app from '../src/server.js';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function auditUI() {
  const html = await fs.readFile('index.html', 'utf-8');
  const required = [
    'Memory System',
    'Login / Signup',
    'data-tab="text"',
    'data-tab="link"',
    'data-tab="file"',
    'data-tab="email"',
    'data-tab="json"',
    'id="feed"',
    'id="health"',
    'id="logs"',
    'id="schema"'
  ];

  for (const token of required) {
    assert(html.includes(token), `UI missing token: ${token}`);
  }

  return { ok: true, checked: required.length };
}

function getRoutes() {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map((m) => m.toUpperCase());
      routes.push({ path: middleware.route.path, methods });
    }
  });
  return routes;
}

function auditRoutes() {
  const routes = getRoutes();
  const expected = [
    ['GET', '/api'],
    ['GET', '/api/test'],
    ['GET', '/api/items'],
    ['POST', '/api/items'],
    ['DELETE', '/api/items'],
    ['POST', '/api/sync'],
    ['POST', '/api/sync/run'],
    ['POST', '/api/email'],
    ['GET', '/api/health'],
    ['GET', '/api/health/system'],
    ['GET', '/api/logs'],
    ['GET', '/api/sources'],
    ['POST', '/api/sources'],
    ['GET', '/api/relations'],
    ['POST', '/api/relations'],
    ['POST', '/api/auth/signup'],
    ['POST', '/api/auth/login'],
    ['GET', '/api/auth/me'],
    ['POST', '/api/auth/logout'],
    ['POST', '/api/admin/backup'],
    ['GET', '/api/admin/stats'],
    ['POST', '/api/upload'],
    ['POST', '/api/files/delete']
  ];

  for (const [method, path] of expected) {
    const found = routes.find((r) => r.path === path && r.methods.includes(method));
    assert(Boolean(found), `Route missing: ${method} ${path}`);
  }

  return { ok: true, checked: expected.length };
}

async function run() {
  const ui = await auditUI();
  const route = auditRoutes();
  console.log(JSON.stringify({ ui, route }, null, 2));
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
