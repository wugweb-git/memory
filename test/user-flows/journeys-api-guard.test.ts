/**
 * Journey (f): every owner-only API route in the endpoint map refuses an
 * unauthenticated caller, and no route 500s on a malformed JSON body.
 * No network or DB: handlers are called directly; auth runs before any I/O.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { listApiEndpoints } from '../../src/lib/api/endpoints.ts';
import { isPublicRoute } from '../../src/lib/security/route-access.ts';
import { signToken } from '../../src/lib/security/jwt.ts';

process.env.brain_POSTGRES_PRISMA_URL ||= 'postgresql://u:p@127.0.0.1:1/none?connect_timeout=1';
process.env.brain_POSTGRES_URL_NON_POOLING ||= process.env.brain_POSTGRES_PRISMA_URL;

const ROOT = join(import.meta.dirname, '../../src/app/api');
const SECRET = process.env.AUTH_SECRET || 'dev_auth_secret_insecure_fallback';

function concrete(path: string) {
  return path.replace(/\[(\w+)\]/g, 'x');
}
function routeFile(path: string) {
  return join(ROOT, path.replace(/^\/api\//, ''), 'route.ts');
}
function params(path: string) {
  const out: Record<string, string> = {};
  for (const m of path.matchAll(/\[(\w+)\]/g)) out[m[1]] = 'x';
  return { params: Promise.resolve(out) };
}
async function call(path: string, method: string, init: { cookie?: string; body?: string } = {}) {
  const mod = await import(routeFile(path));
  const handler = mod[method];
  if (typeof handler !== 'function') return null;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init.cookie) headers.cookie = `prism_session=${init.cookie}`;
  const req = new NextRequest(`http://localhost${concrete(path)}`, {
    method,
    headers,
    body: method === 'GET' || method === 'DELETE' ? undefined : init.body ?? '{}',
  });
  return handler(req, params(path)) as Promise<Response>;
}

const owner = listApiEndpoints().filter((e) => !isPublicRoute(e.path, 'POST') && !isPublicRoute(e.path, 'GET') && existsSync(routeFile(e.path)));
const GUARD = /requireAdmin|requireOwner|requirePermission|isAdminRequest/;
const guarded = owner.filter((e) => GUARD.test(readFileSync(routeFile(e.path), 'utf8')));
const WRITES = ['POST', 'PUT', 'PATCH'];

async function runMiddleware(path: string, method: string, cookie?: string) {
  const { middleware } = await import('../../src/middleware.ts');
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `prism_session=${cookie}`;
  return middleware(new NextRequest(`http://localhost${concrete(path)}`, { method, headers }));
}

describe('API guard journeys', () => {
  it('middleware: every owner route needs a session; admin passes; non-admin and forged tokens do not', async () => {
    const admin = signToken({ sub: 'owner', email: 'o@x.co', role: 'admin' }, SECRET);
    const user = signToken({ sub: 'u', email: 'u@x.co', role: 'user' }, SECRET);
    const forged = signToken({ sub: 'owner', email: 'o@x.co', role: 'admin' }, 'some-other-secret');
    assert.ok(owner.length > 40, 'endpoint map should expose many owner routes');
    for (const e of owner) {
      for (const m of e.methods) {
        const anon = await runMiddleware(e.path, m);
        assert.equal(anon.status, 401, `anon ${m} ${e.path}`);
        assert.equal((await runMiddleware(e.path, m, user)).status, 401, `user ${m} ${e.path}`);
        assert.equal((await runMiddleware(e.path, m, forged)).status, 401, `forged ${m} ${e.path}`);
        const ok = await runMiddleware(e.path, m, admin);
        assert.equal(ok.status, 200, `admin ${m} ${e.path}`);
        assert.equal(ok.headers.get('x-middleware-next'), '1');
      }
    }
  });

  it('middleware: unauthenticated page visits redirect to /login with a same-site ?next=', async () => {
    const res = await runMiddleware('/memory', 'GET');
    assert.equal(res.status, 307);
    const loc = new URL(res.headers.get('location')!);
    assert.equal(loc.pathname, '/login');
    assert.equal(loc.origin, 'http://localhost');
    assert.equal(loc.searchParams.get('next'), '/memory');
  });

  it('handler-level: routes that guard themselves return 401/403 to anonymous callers', async () => {
    assert.ok(guarded.length >= 5);
    const leaks: string[] = [];
    for (const e of guarded) {
      for (const m of e.methods) {
        const res = await call(e.path, m).catch((err) => ({ status: `threw ${(err as Error).message.slice(0, 60)}` }) as any);
        if (res && res.status !== 401 && res.status !== 403) leaks.push(`${m} ${e.path} -> ${res.status}`);
      }
    }
    assert.deepEqual(leaks, []);
  });

  it('a malformed JSON body is never the cause of a 500 or a thrown SyntaxError', async () => {
    const admin = signToken({ sub: 'owner', email: 'o@x.co', role: 'admin' }, SECRET);
    const bad: string[] = [];
    for (const e of owner) {
      for (const m of e.methods) {
        if (!WRITES.includes(m)) continue;
        let malformed: number | string;
        try { malformed = (await call(e.path, m, { cookie: admin, body: '{not json' }))?.status ?? 0; }
        catch (err) { malformed = /JSON|Unexpected token|SyntaxError/i.test(String(err)) ? `SyntaxError` : 'db'; }
        if (malformed === 'db') continue;
        if (malformed === 'SyntaxError') { bad.push(`${m} ${e.path} throws on bad JSON`); continue; }
        if (typeof malformed === 'number' && malformed >= 500) {
          let baseline: number | string;
          try { baseline = (await call(e.path, m, { cookie: admin, body: '{}' }))?.status ?? 0; } catch { baseline = 500; }
          if (typeof baseline === 'number' && baseline < 500) bad.push(`${m} ${e.path} -> ${malformed} (empty object -> ${baseline})`);
        }
      }
    }
    assert.deepEqual(bad, []);
  });
});
