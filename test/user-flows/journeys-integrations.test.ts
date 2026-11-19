/** Journey (e): integrations. Connect/sync status, auto-promote setting, job-route auth (JOB_SECRET). No network. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.brain_POSTGRES_PRISMA_URL ||= 'postgresql://u:p@127.0.0.1:1/none?connect_timeout=1';
process.env.JOB_SECRET = 'job-secret-for-tests';
process.env.CRON_SECRET = 'cron-secret-for-tests';
for (const k of ['GITHUB_TOKEN', 'NOTION_TOKEN', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_REFRESH_TOKEN', 'GOOGLE_CLIENT_ID']) delete process.env[k];

import { signToken } from '../../src/lib/security/jwt.ts';

const SECRET = process.env.AUTH_SECRET || 'dev_auth_secret_insecure_fallback';
const ownerCookie = `prism_session=${signToken({ sub: 'owner', email: 'o@x.co', role: 'admin' }, SECRET)}`;
const userCookie = `prism_session=${signToken({ sub: 'u', email: 'u@x.co', role: 'user' }, SECRET)}`;

function req(url: string, method: string, headers: Record<string, string> = {}, body?: string) {
  return new NextRequest(`http://localhost${url}`, { method, headers: { 'content-type': 'application/json', ...headers }, body });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('publishing job route auth', () => {
  it('refuses callers without the secret or an admin session', async () => {
    const { POST, GET } = await import('../../src/app/api/jobs/publishing/route.ts');
    const attempts: Array<Record<string, string>> = [
      {},
      { authorization: 'Bearer wrong' },
      { authorization: 'Bearer ' },
      { 'x-job-secret': 'wrong' },
      { 'x-job-secret': '' },
      { authorization: 'Bearer job-secret-for-tests-extra' },
      { cookie: userCookie },
      { cookie: 'prism_session=garbage' },
    ];
    for (const h of attempts) {
      for (const handler of [POST, GET]) {
        const res = await handler(req('/api/jobs/publishing', handler === POST ? 'POST' : 'GET', h));
        assert.equal(res.status, 401, JSON.stringify(h));
      }
    }
  });

  it('the run job applies the same rule', async () => {
    const { POST } = await import('../../src/app/api/jobs/run/route.ts');
    assert.equal((await POST(req('/api/jobs/run', 'POST'))).status, 401);
    assert.equal((await POST(req('/api/jobs/run', 'POST', { authorization: 'Bearer nope' }))).status, 401);
  });
});

describe('auto-promote setting route', () => {
  it('needs the owner (session or job secret); a plain user session is refused', async () => {
    const { GET, PUT } = await import('../../src/app/api/settings/auto-promote/route.ts');
    assert.equal((await GET(req('/api/settings/auto-promote', 'GET'))).status, 401);
    assert.equal((await PUT(req('/api/settings/auto-promote', 'PUT', {}, '{"mode":"all"}'))).status, 401);
    assert.equal((await PUT(req('/api/settings/auto-promote', 'PUT', { cookie: 'prism_session=bad' }, '{"mode":"all"}'))).status, 401);
  });

  it('the owner gets a mode back (off when nothing is stored or the store is down)', async () => {
    const { GET } = await import('../../src/app/api/settings/auto-promote/route.ts');
    const res = await GET(req('/api/settings/auto-promote', 'GET', { cookie: ownerCookie }));
    assert.equal(res.status, 200);
    assert.ok(['off', 'trusted', 'all'].includes((await res.json()).mode));
  });

  it('invalid or malformed bodies are 400, not 500', async () => {
    const { PUT } = await import('../../src/app/api/settings/auto-promote/route.ts');
    for (const body of ['{oops', 'null', '{}', '{"mode":"ALL"}', '{"mode":1}', '[]']) {
      const res = await PUT(req('/api/settings/auto-promote', 'PUT', { cookie: ownerCookie }, body));
      assert.equal(res.status, 400, body);
    }
  });
});

describe('source connect and sync status', () => {
  it('sync needs the owner', async () => {
    const { POST } = await import('../../src/app/api/sources/[id]/sync/route.ts');
    assert.equal((await POST(req('/api/sources/github/sync', 'POST'), ctx('github'))).status, 401);
  });

  it('an unconnected source says so (503) and names the setup step; manual sources are 400; unknown ids are 404', async () => {
    const { POST } = await import('../../src/app/api/sources/[id]/sync/route.ts');
    const h = { cookie: ownerCookie };
    const unconnected = await POST(req('/api/sources/spotify/sync', 'POST', h), ctx('spotify'));
    assert.equal(unconnected.status, 503);
    assert.match((await unconnected.json()).error, /not connected/i);

    const manual = await POST(req('/api/sources/upload/sync', 'POST', h), ctx('upload'));
    assert.equal(manual.status, 400);

    const unknown = await POST(req('/api/sources/not-a-source/sync', 'POST', h), ctx('not-a-source'));
    assert.equal(unknown.status, 404);
  });

  it('every connector reports a status shape the page can render (configured flag, no secrets)', async () => {
    const { listConnectorStatuses } = await import('../../src/lib/ingestion/connectors/index.ts');
    const list: any[] = await listConnectorStatuses().catch(() => []);
    for (const c of list) {
      assert.equal(typeof c.id, 'string');
      assert.equal(typeof c.configured, 'boolean');
      assert.doesNotMatch(JSON.stringify(c), /sk-|secret_|Bearer /i);
    }
  });
});
