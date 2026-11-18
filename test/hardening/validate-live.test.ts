import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore plain .mjs script, no types
import { checks, runChecks, exitCode, isAllowedBase, parseArgs } from '../../scripts/validate-live.mjs';

type Handler = (url: string, init?: any) => Response;
const BASE = 'https://example.test';

function mockFetch(routes: Record<string, Handler>, calls: string[] = []): typeof fetch {
  return (async (url: string, init?: any) => {
    const path = new URL(url).pathname;
    calls.push(`${init?.method || 'GET'} ${path}`);
    const h = routes[path];
    return h ? h(url, init) : new Response('nf', { status: 404 });
  }) as unknown as typeof fetch;
}

const vid = { 'x-vercel-id': 'abc' };
const manifest = { name: 'n', start_url: '/', icons: [{ src: 'a', purpose: 'any' }, { src: 'b', purpose: 'maskable' }] };
const sse = 'data: {"type":"text-delta","delta":"hi"}\n\ndata: [DONE]\n\n';

function goodRoutes(): Record<string, Handler> {
  return {
    '/ask': () => new Response('ok', { status: 200, headers: vid }),
    '/login': () => new Response('<p>Keep me signed in</p>', { status: 200 }),
    '/api/jobs/process': (_u, i) =>
      i?.headers?.authorization
        ? new Response(JSON.stringify({ embedding: { scanned: 5, embedded: 4, failed: 1 } }), { status: 200 })
        : new Response('', { status: 401 }),
    '/api/memory/list': () => new Response('', { status: 401 }),
    '/api/memory/public': () => new Response('', { status: 401 }),
    '/api/health/system': () => new Response('', { status: 401 }),
    '/api/profile/system_user': () => new Response(JSON.stringify({ isPublished: true }), { status: 200 }),
    '/api/showcase': () => new Response(JSON.stringify({ enabled: true, items: [{ _id: 'abc' }] }), { status: 200 }),
    '/manifest.json': () => new Response(JSON.stringify(manifest), { status: 200 }),
    '/sw.js': () => new Response('//', { status: 200, headers: { 'content-type': 'application/javascript' } }),
    '/api/chat': () => new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
  };
}

const ctxOf = (routes: Record<string, Handler>, extra: any = {}) => ({ base: BASE, fetch: mockFetch(routes), env: {}, ...extra });

describe('validate-live', () => {
  it('all pass on a healthy mock; job check SKIPs without secret', async () => {
    const r = await runChecks(ctxOf(goodRoutes()));
    assert.deepEqual(r.filter((x: any) => x.status === 'FAIL'), []);
    assert.equal(r.find((x: any) => x.name.includes('with secret')).status, 'SKIP');
    assert.equal(exitCode(r), 0);
  });

  it('reports embedding counts with secret and never prints it', async () => {
    const r = await runChecks(ctxOf(goodRoutes(), { env: { VALIDATE_JOB_SECRET: 'S3CRET' } }));
    const j = r.find((x: any) => x.name.includes('with secret'));
    assert.equal(j.status, 'PASS');
    assert.match(j.detail, /scanned=5 embedded=4 failed=1/);
    assert.ok(!JSON.stringify(r).includes('S3CRET'));
  });

  it('FAILs and exits 1 when a protected route is public', async () => {
    const routes = goodRoutes();
    routes['/api/memory/list'] = () => new Response('[]', { status: 200 });
    const r = await runChecks(ctxOf(routes));
    assert.equal(r.find((x: any) => x.name.includes('memory/list')).status, 'FAIL');
    assert.equal(exitCode(r), 1);
  });

  it('FAILs on draft ids, missing maskable icon, bad sw content type, missing x-vercel-id', async () => {
    const routes = goodRoutes();
    routes['/api/showcase'] = () => new Response(JSON.stringify({ enabled: true, items: [{ _id: 'drafts.x' }] }), { status: 200 });
    routes['/manifest.json'] = () => new Response(JSON.stringify({ ...manifest, icons: [{ src: 'a' }] }), { status: 200 });
    routes['/sw.js'] = () => new Response('x', { status: 200, headers: { 'content-type': 'text/html' } });
    routes['/ask'] = () => new Response('ok', { status: 200 });
    const r = await runChecks(ctxOf(routes));
    for (const n of ['showcase', 'manifest', 'sw.js', 'x-vercel-id']) {
      assert.equal(r.find((x: any) => x.name.includes(n)).status, 'FAIL', n);
    }
  });

  it('chat: --no-chat SKIPs with zero chat requests; default makes exactly one', async () => {
    const calls: string[] = [];
    const f = mockFetch(goodRoutes(), calls);
    await runChecks({ base: BASE, fetch: f, env: {}, noChat: true });
    assert.equal(calls.filter((c) => c.endsWith('/api/chat')).length, 0);
    calls.length = 0;
    await runChecks({ base: BASE, fetch: f, env: {} });
    assert.equal(calls.filter((c) => c === 'POST /api/chat').length, 1);
  });

  it('chat FAILs without [DONE]; thrown fetch errors become FAIL', async () => {
    const routes = goodRoutes();
    routes['/api/chat'] = () => new Response('data: text-delta\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
    routes['/sw.js'] = () => { throw new Error('boom'); };
    const r = await runChecks(ctxOf(routes));
    assert.equal(r.find((x: any) => x.name.includes('api/chat')).status, 'FAIL');
    const sw = r.find((x: any) => x.name.includes('sw.js'));
    assert.equal(sw.status, 'FAIL');
    assert.match(sw.detail, /boom/);
  });

  it('exitCode: SKIP-only is 0, any FAIL is 1; checks are {name, run}', () => {
    assert.equal(exitCode([{ status: 'SKIP' }, { status: 'PASS' }]), 0);
    assert.equal(exitCode([{ status: 'PASS' }, { status: 'FAIL' }]), 1);
    assert.ok(checks.every((c: any) => typeof c.name === 'string' && typeof c.run === 'function'));
  });

  it('refuses vercel preview bases and parses args', () => {
    assert.equal(isAllowedBase('https://memory-git-main-wugweb.vercel.app'), false);
    assert.equal(isAllowedBase('https://www.vedanshusrivastava.com'), true);
    const o = parseArgs(['--base', 'https://a.test', '--json', '--no-chat']);
    assert.deepEqual([o.base, o.json, o.noChat], ['https://a.test', true, true]);
  });
});
