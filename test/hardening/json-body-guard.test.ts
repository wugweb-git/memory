/**
 * Routes that read a JSON body must answer 400 (never 500) for a literal null,
 * an array, a string, malformed JSON, and an empty object missing its fields.
 * Handlers are called directly; the body check runs before any database call.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { join } from 'node:path';
import { signToken } from '../../src/lib/security/jwt.ts';
import { dailyLimitResponse, DAILY_LIMIT_MESSAGE } from '../../src/lib/cognitive/limit-response.ts';
import { friendlyStatus } from '../../src/app/cognitive/_components/shared.tsx';

process.env.brain_POSTGRES_PRISMA_URL ||= 'postgresql://u:p@127.0.0.1:1/none?connect_timeout=1';
process.env.brain_POSTGRES_URL_NON_POOLING ||= process.env.brain_POSTGRES_PRISMA_URL;

const ROOT = join(import.meta.dirname, '../../src/app/api');
const SECRET = process.env.AUTH_SECRET || 'dev_auth_secret_insecure_fallback';
const admin = signToken({ sub: 'owner', email: 'o@x.co', role: 'admin' }, SECRET);

const ROUTES: Array<{ path: string; method: string }> = [
  { path: 'memory/packet/action', method: 'POST' },
  { path: 'memory/replay', method: 'POST' },
  { path: 'memory/retrieve', method: 'POST' },
  { path: 'processing/semantic', method: 'POST' },
  { path: 'processing/signals', method: 'POST' },
  { path: 'admin/checklist', method: 'PATCH' },
];

async function call(path: string, method: string, body: string) {
  const mod = await import(join(ROOT, path, 'route.ts'));
  const req = new NextRequest(`http://localhost/api/${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie: `prism_session=${admin}` },
    body,
  });
  return (await mod[method](req)) as Response;
}

describe('JSON body guard', () => {
  for (const { path, method } of ROUTES) {
    for (const [label, body] of [['null', 'null'], ['array', '[]'], ['string', '"x"'], ['malformed', '{nope']] as const) {
      it(`${method} /api/${path} answers 400 for ${label}`, async () => {
        const res = await call(path, method, body);
        assert.equal(res.status, 400);
        assert.ok(typeof (await res.json()).error === 'string');
      });
    }
    it(`${method} /api/${path} keeps its field-level 400 for {}`, async () => {
      const res = await call(path, method, '{}');
      assert.equal(res.status, 400);
    });
  }
});

describe('daily limit mapping', () => {
  it('maps a wrapped BUDGET_EXCEEDED error to 429 with a reset message, and ignores other errors', async () => {
    const res = dailyLimitResponse(new Error('LLM_FAILURE: BUDGET_EXCEEDED(decision): Daily decision request budget used up (50/50).'));
    assert.equal(res?.status, 429);
    assert.equal((await res!.json()).message, DAILY_LIMIT_MESSAGE);
    assert.equal(dailyLimitResponse(new Error('LLM_FAILURE: provider down')), null);
  });

  it('friendlyStatus shows the server message on 429 and does not override a message on 5xx', () => {
    assert.equal(friendlyStatus(429, DAILY_LIMIT_MESSAGE), DAILY_LIMIT_MESSAGE);
    assert.match(friendlyStatus(429) ?? '', /Too many requests/);
    assert.equal(friendlyStatus(502, 'Specific reason'), null);
    assert.match(friendlyStatus(502) ?? '', /service had a problem/);
  });
});
