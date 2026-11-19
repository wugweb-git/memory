/** Journey (c): ask. Request validation, stop/retry copy, owner vs public scope. No LLM or DB. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.brain_POSTGRES_PRISMA_URL ||= 'postgresql://u:p@127.0.0.1:1/none?connect_timeout=1';
process.env.OPENAI_API_KEY = 'sk-test-not-real';
delete process.env.OPENROUTER_API_KEY;

import { ASK_STOPPED_NOTE, answerNotice } from '../../src/lib/chat/ask-helpers.ts';
import { chatRetrievalFilters, emptyContextText, NO_PUBLIC_NOTES_MESSAGE } from '../../src/lib/memory/visibility.ts';
import { isAdminRequest } from '../../src/lib/security/auth.ts';
import { signToken } from '../../src/lib/security/jwt.ts';

// An admin session skips the visitor rate limiter (which would wait on the absent DB); validation is identical for both.
const adminCookie = signToken({ sub: 'o', email: 'o@x.co', role: 'admin' }, process.env.AUTH_SECRET || 'dev_auth_secret_insecure_fallback');
const post = (body: string) =>
  new Request('http://localhost/api/chat', { method: 'POST', headers: { 'content-type': 'application/json', cookie: `prism_session=${adminCookie}` }, body });

describe('ask journey: request validation', () => {
  it('malformed, non-object and empty bodies are 400s, never 500s', async () => {
    const { POST } = await import('../../src/app/api/chat/route.ts');
    for (const body of ['{nope', 'null', '[]', '"hi"', '{}', '{"messages":[]}', '{"messages":[null,5]}']) {
      const res = await POST(post(body));
      assert.equal(res.status, 400, body);
    }
  });

  it('a conversation with no user text (assistant only, blank, wrong shape) is a 400', async () => {
    const { POST } = await import('../../src/app/api/chat/route.ts');
    const cases = [
      { messages: [{ id: '1', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }] },
      { messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: '   ' }] }] },
      { messages: [{ role: 'user', content: 123 }] },
      { messages: [{ role: 'user', parts: 'not-an-array' }] },
    ];
    for (const c of cases) {
      const res = await POST(post(JSON.stringify(c)));
      assert.equal(res.status, 400, JSON.stringify(c));
    }
  });

  it('with no chat provider configured the route says so (401) instead of crashing', async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    for (const k of ['GROQ_API_KEY', 'AI_GATEWAY_BASE_URL', 'AI_GATEWAY_API_KEY', 'OPENROUTER_API_KEY']) delete process.env[k];
    try {
      const { POST } = await import('../../src/app/api/chat/route.ts');
      const res = await POST(post('{"messages":[]}'));
      assert.equal(res.status, 401);
    } finally {
      process.env.OPENAI_API_KEY = saved;
    }
  });
});

describe('ask journey: owner vs public scope', () => {
  const secret = process.env.AUTH_SECRET || 'dev_auth_secret_insecure_fallback';
  const req = (cookie?: string) => new Request('http://localhost/api/chat', { headers: cookie ? { cookie: `prism_session=${cookie}` } : {} });

  it('visitors and non-admin sessions are public-only; only an admin session sees full memory', () => {
    assert.deepEqual(chatRetrievalFilters(isAdminRequest(req())), { publicOnly: true });
    const user = signToken({ sub: 'u', email: 'u@x.co', role: 'user' }, secret);
    assert.deepEqual(chatRetrievalFilters(isAdminRequest(req(user))), { publicOnly: true });
    const forged = signToken({ sub: 'o', email: 'o@x.co', role: 'admin' }, 'wrong-secret');
    assert.deepEqual(chatRetrievalFilters(isAdminRequest(req(forged))), { publicOnly: true });
    const admin = signToken({ sub: 'o', email: 'o@x.co', role: 'admin' }, secret);
    assert.deepEqual(chatRetrievalFilters(isAdminRequest(req(admin))), { publicOnly: false });
  });

  it('a visitor with nothing public matched is told so rather than invented answers', () => {
    assert.match(emptyContextText(false), new RegExp(NO_PUBLIC_NOTES_MESSAGE));
    assert.match(emptyContextText(false), /do not guess/);
    assert.doesNotMatch(emptyContextText(true), new RegExp(NO_PUBLIC_NOTES_MESSAGE));
  });
});

describe('ask journey: stop and retry', () => {
  it('stopping is neutral and invites a retry; a real failure is an error; streaming shows nothing', () => {
    assert.match(ASK_STOPPED_NOTE, /Retry/);
    assert.equal(answerNotice({ hasError: true, userStopped: true, isLoading: false }), 'stopped');
    assert.equal(answerNotice({ hasError: true, userStopped: false, isLoading: false }), 'error');
    assert.equal(answerNotice({ hasError: false, userStopped: false, isLoading: true }), 'none');
    assert.equal(answerNotice({ hasError: false, userStopped: false, isLoading: false }), 'none');
  });
});
