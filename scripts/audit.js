import fs from 'fs/promises';
import app from '../src/server.js';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function auditUI() {
  const html = await fs.readFile('index.html', 'utf-8');
  const required = ['Memory System', 'id="feed"', 'id="health"'];

  for (const token of required) {
    assert(html.includes(token), `UI missing token: ${token}`);
  }

  return { ok: true, checked: required.length };
}

function getRoutes() {
  const routes = [];
  const stack = app._router?.stack || app.router?.stack || [];
  stack.forEach((layer) => {
    if (!layer.route) return;
    routes.push({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).map((method) => method.toUpperCase())
    });
  });
  return routes;
}

function auditRoutes() {
  const routes = getRoutes();
  const expected = [
    ['GET', '/api'],
    ['GET', '/api/*']
  ];

  for (const [method, path] of expected) {
    const found = routes.find((route) => route.path === path && route.methods.includes(method));
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
