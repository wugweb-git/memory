/** Journey (a): sign in -> session cookie -> protected API 401/200 -> sign out, plus ?next= handling. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.ADMIN_EMAIL = 'owner@example.test';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
process.env.AUTH_SECRET = 'journey-test-secret';
process.env.brain_POSTGRES_PRISMA_URL ||= 'postgresql://u:p@127.0.0.1:1/none?connect_timeout=1';

const json = (url: string, method: string, body: unknown, cookie?: string) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

/** Same rule as the sign-in page (src/app/login/page.tsx `safeNext`). */
function safeNext(next: string) {
  const clean = next.replace(/[\u0000-\u001f\u007f]/g, '');
  return clean === next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') && !next.startsWith('/login') ? next : '/console';
}

describe('sign-in journey', () => {
  it('rejects malformed and incomplete sign-in bodies without a 500 or a cookie', async () => {
    const { POST } = await import('../../src/app/api/auth/login/route.ts');
    for (const body of ['{oops', 'null', '[]', '{}', { email: 'a@b.co' }, { password: 'x' }, { email: 5, password: 6 }]) {
      const res = await POST(json('/api/auth/login', 'POST', body));
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.headers.get('set-cookie'), null);
    }
  });

  it('owner credentials issue an HttpOnly session that /api/auth/me and the middleware accept', async () => {
    const { POST } = await import('../../src/app/api/auth/login/route.ts');
    const res = await POST(json('/api/auth/login', 'POST', { email: ' OWNER@example.test ', password: 'correct-horse-battery' }));
    assert.equal(res.status, 200);
    const setCookie = res.headers.get('set-cookie')!;
    assert.match(setCookie, /^prism_session=/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Max-Age=/);
    const cookie = setCookie.split(';')[0];

    const { GET: me } = await import('../../src/app/api/auth/me/route.ts');
    const meRes = await me(new NextRequest('http://localhost/api/auth/me', { headers: { cookie } }));
    assert.equal(meRes.status, 200);
    assert.equal((await meRes.json()).role, 'admin');

    const { middleware } = await import('../../src/middleware.ts');
    const protectedRes = await middleware(new NextRequest('http://localhost/api/memory/stats', { headers: { cookie } }));
    assert.equal(protectedRes.status, 200);
  });

  it('"keep me signed in" off gives a browser-session cookie', async () => {
    const { POST } = await import('../../src/app/api/auth/login/route.ts');
    const res = await POST(json('/api/auth/login', 'POST', { email: 'owner@example.test', password: 'correct-horse-battery', remember: false }));
    assert.doesNotMatch(res.headers.get('set-cookie')!, /Max-Age/);
  });

  it('a wrong password or no session is refused: 401 on /me and on protected APIs', async () => {
    const { POST } = await import('../../src/app/api/auth/login/route.ts');
    const bad = await POST(json('/api/auth/login', 'POST', { email: 'owner@example.test', password: 'wrong' }));
    assert.notEqual(bad.status, 200);
    assert.equal(bad.headers.get('set-cookie'), null);

    const { GET: me } = await import('../../src/app/api/auth/me/route.ts');
    assert.equal((await me(new NextRequest('http://localhost/api/auth/me'))).status, 401);
    const { middleware } = await import('../../src/middleware.ts');
    assert.equal((await middleware(new NextRequest('http://localhost/api/memory/stats'))).status, 401);
    assert.equal((await middleware(new NextRequest('http://localhost/api/memory/stats', { headers: { cookie: 'prism_session=garbage' } }))).status, 401);
  });

  it('sign out clears the cookie', async () => {
    const { POST } = await import('../../src/app/api/auth/logout/route.ts');
    const res = await POST();
    assert.match(res.headers.get('set-cookie')!, /prism_session=;.*Max-Age=0/);
  });
});

describe('?next= redirect handling', () => {
  it('the middleware only ever sends a same-site path as next', async () => {
    const { middleware } = await import('../../src/middleware.ts');
    const res = await middleware(new NextRequest('http://localhost/memory?tab=signals'));
    assert.equal(res.status, 307);
    const loc = new URL(res.headers.get('location')!);
    assert.equal(loc.origin, 'http://localhost');
    assert.equal(loc.searchParams.get('next'), '/memory?tab=signals');
  });

  it('safeNext keeps real paths and refuses open-redirect shapes', () => {
    assert.equal(safeNext('/memory?tab=signals'), '/memory?tab=signals');
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'evil.com', '', '/login', '/login?next=/x']) {
      assert.equal(safeNext(bad), '/console', bad);
    }
  });

  // Browsers strip tab/CR/LF from URLs, so "/\t/evil.com" parses as "//evil.com".
  it('safeNext refuses control characters that collapse into "//"', () => {
    for (const bad of ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com']) {
      assert.equal(safeNext(bad), '/console', JSON.stringify(bad));
    }
  });
});
