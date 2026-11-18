import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { getRequestUser, isAdminRequest, requireAdmin } from '../../src/lib/security/auth.ts';
import { getRequestUserId } from '../../src/lib/identity/request.ts';
import { signToken } from '../../src/lib/security/jwt.ts';
import { INTERNAL_VAULT } from '../../src/config/vault.ts';
import { IDENTITY_CONFIG } from '../../src/config/identity.ts';

const ROOT = join(import.meta.dirname, '../../src');

function req(url: string, init: { headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://localhost${url}`, init);
}
const token = (role: string) =>
  signToken({ sub: 'owner_1', email: 'o@x.io', role }, INTERNAL_VAULT.AUTH_SECRET);

describe('identity comes only from the signed session', () => {
  it('ignores x-user-id / x-user-role headers', () => {
    const a = getRequestUser(req('/api/x', { headers: { 'x-user-id': 'attacker', 'x-user-role': 'admin' } }));
    assert.equal(a.authenticated, false);
    assert.equal(a.userId, IDENTITY_CONFIG.DEFAULT_USER_ID);
    assert.equal(a.role, 'user');
  });

  it('ignores ?userId= query param', () => {
    const a = getRequestUser(req('/api/x?userId=attacker'));
    assert.equal(a.userId, IDENTITY_CONFIG.DEFAULT_USER_ID);
    assert.equal(getRequestUserId(req('/api/x?userId=attacker')), IDENTITY_CONFIG.DEFAULT_USER_ID);
  });

  it('resolves identity from a valid cookie or bearer token', () => {
    const t = token('admin');
    assert.equal(getRequestUser(req('/api/x', { headers: { cookie: `prism_session=${t}` } })).userId, 'owner_1');
    assert.equal(getRequestUser(req('/api/x', { headers: { authorization: `Bearer ${t}` } })).userId, 'owner_1');
  });

  it('rejects a tampered token', () => {
    const t = token('admin') + 'x';
    const a = getRequestUser(req('/api/x', { headers: { cookie: `prism_session=${t}` } }));
    assert.equal(a.authenticated, false);
  });

  it('works for plain Request objects (chat route)', () => {
    const t = token('admin');
    const plain = new Request('http://localhost/api/chat', { headers: { cookie: `a=b; prism_session=${t}` } });
    assert.equal(isAdminRequest(plain), true);
    assert.equal(isAdminRequest(new Request('http://localhost/api/chat')), false);
  });

  it('no source file reads identity from headers or userId query/body', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx)$/.test(e) || full.endsWith('middleware.ts')) continue;
        const src = readFileSync(full, 'utf8');
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        if (/headers\.get\(['"]x-user-(id|role)['"]\)/.test(code)) offenders.push(`${full} (header)`);
        if (/searchParams\.get\(['"]userId['"]\)/.test(code)) offenders.push(`${full} (query)`);
        if (/\?userId=/.test(code)) offenders.push(`${full} (?userId=)`);
        if (/body\??\.userId/.test(code)) offenders.push(`${full} (body.userId)`);
      }
    };
    walk(ROOT);
    assert.deepEqual(offenders, []);
  });
});

describe('requireAdmin (defence in depth)', () => {
  it('401 with no session, 403 for a non-admin session, passes for admin', async () => {
    const none = requireAdmin(req('/api/memory/list'));
    assert.equal((none as Response).status, 401);
    const user = requireAdmin(req('/api/x', { headers: { authorization: `Bearer ${token('user')}` } }));
    assert.equal((user as Response).status, 403);
    assert.deepEqual(await (user as Response).json(), { error: 'Admin access required' });
    const admin = requireAdmin(req('/api/x', { headers: { authorization: `Bearer ${token('admin')}` } }));
    assert.equal('userId' in admin, true);
  });

  it('spoofed admin header does not pass', () => {
    const r = requireAdmin(req('/api/x', { headers: { 'x-user-role': 'admin' } }));
    assert.equal((r as Response).status, 401);
  });

  it('every memory, blob, persona and admin handler gates on requireAdmin/requireOwner', () => {
    const missing: string[] = [];
    for (const area of ['memory', 'blob', 'persona', 'admin']) {
      const walk = (dir: string) => {
        for (const e of readdirSync(dir)) {
          const full = join(dir, e);
          if (statSync(full).isDirectory()) { walk(full); continue; }
          if (e !== 'route.ts') continue;
          const src = readFileSync(full, 'utf8');
          const handlers = src.match(/export async function (GET|POST|PATCH|PUT|DELETE)\(/g) ?? [];
          const gates = src.match(/require(Admin|Owner)\(/g) ?? [];
          if (handlers.length > gates.length) missing.push(full.replace(ROOT, ''));
        }
      };
      walk(join(ROOT, 'app/api', area));
    }
    assert.deepEqual(missing, []);
  });

  it('cron and job routes still authenticate with their Bearer secrets', () => {
    for (const f of ['app/api/jobs/run/route.ts', 'app/api/jobs/process/route.ts']) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      assert.match(src, /CRON_SECRET/);
      assert.match(src, /JOB_SECRET/);
      assert.match(src, /authorization/);
    }
  });
});
