import fs from 'fs/promises';
import request from 'supertest';
import app from '../src/server.js';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function auditUI() {
  const html = await fs.readFile('index.html', 'utf-8');
  const requiredTokens = [
    'Memory System',
    'id="authCard"',
    'id="saveBtn"',
    'id="refreshTopBtn"',
    'id="dbCheckBtn"',
    'id="feed"',
    'id="health"',
    "request('/items'",
    "request('/sync'",
    "request('/email'",
    "request('/health'"
  ];

  for (const token of requiredTokens) {
    assert(html.includes(token), `UI missing token: ${token}`);
  }

  return { ok: true, checked: requiredTokens.length };
}

async function auditApiIndex() {
  const res = await request(app).get('/api').expect(200);
  const endpoints = res.body?.endpoints || [];
  const expected = [
    '/api/test',
    '/api/test-db',
    '/api/auth/signup',
    '/api/auth/login',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/items',
    '/api/sync',
    '/api/email',
    '/api/health'
  ];

  for (const endpoint of expected) {
    assert(endpoints.includes(endpoint), `API index missing endpoint: ${endpoint}`);
  }

  return { ok: true, checked: expected.length };
}

async function run() {
  const ui = await auditUI();
  const api = await auditApiIndex();
  console.log(JSON.stringify({ ui, api }, null, 2));
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
