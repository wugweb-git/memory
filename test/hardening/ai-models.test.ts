import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getChain, parseModelList, isOpenRouterEnabled, JOBS } from '../../src/lib/ai/models.ts';
import { runJob, parseTolerantJson, JobFailedError } from '../../src/lib/ai/openrouter.ts';

const KEY_ENV = { OPENROUTER_API_KEY: 'test-key' } as NodeJS.ProcessEnv;

function reply(content: string | null, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

function mockFetch(responses: Array<Response | Error>) {
  const calls: Array<{ model: string; body: any; headers: any }> = [];
  const impl = (async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    calls.push({ model: body.model, body, headers: init.headers });
    const next = responses.shift();
    if (!next) throw new Error('unexpected extra call');
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('ai model registry', () => {
  it('parses env overrides (trim, dedupe, drop empties)', () => {
    assert.deepEqual(parseModelList(' a:free, b:free ,,a:free'), ['a:free', 'b:free']);
    assert.deepEqual(parseModelList(undefined), []);
    assert.deepEqual(getChain('ask', { ASK_MODELS: 'x/y:free, z/w:free' } as any), ['x/y:free', 'z/w:free']);
    assert.deepEqual(getChain('ask', { ASK_MODELS: ' , ' } as any), JOBS.ask.defaults);
  });

  it('has all five jobs with JSON flags', () => {
    assert.deepEqual(Object.keys(JOBS).sort(), ['ask', 'decision', 'ingest', 'signals', 'summary']);
    assert.equal(JOBS.decision.json, true);
    assert.equal(JOBS.ask.json, false);
  });
});

describe('runJob', () => {
  it('falls down the chain in order on 429, 5xx and empty', async () => {
    const { impl, calls } = mockFetch([reply(null, 429), reply('x', 503), reply(''), reply('hello')]);
    const env = { ...KEY_ENV, ASK_MODELS: 'm1:free,m2:free,m3:free,m4:free' } as NodeJS.ProcessEnv;
    const r = await runJob('ask', [{ role: 'user', content: 'hi' }], { env, fetchImpl: impl });
    assert.equal(r.text, 'hello');
    assert.equal(r.model, 'm4:free');
    assert.deepEqual(calls.map((c) => c.model), ['m1:free', 'm2:free', 'm3:free', 'm4:free']);
    assert.deepEqual(r.attempts.map((a) => a.reason ?? 'ok'), ['rate_limited', 'http_503', 'empty', 'ok']);
  });

  it('falls on timeout/network error and throws after one try per model', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const { impl, calls } = mockFetch([abort, reply(null, 429)]);
    const env = { ...KEY_ENV, ASK_MODELS: 'm1:free,m2:free' } as NodeJS.ProcessEnv;
    await assert.rejects(
      runJob('ask', [{ role: 'user', content: 'hi' }], { env, fetchImpl: impl }),
      (e: any) => e instanceof JobFailedError && e.attempts[0].reason === 'timeout' && e.attempts.length === 2,
    );
    assert.equal(calls.length, 2);
  });

  it('JSON jobs: strips fences, falls through unparseable output', async () => {
    const { impl, calls } = mockFetch([reply('sorry, no json here'), reply('```json\n{"a":1}\n```')]);
    const env = { ...KEY_ENV, DECISION_MODELS: 'google/gemma-4-31b-it:free,nvidia/nemotron-3-ultra-550b-a55b:free' } as NodeJS.ProcessEnv;
    const r = await runJob('decision', [{ role: 'user', content: 'x' }], { env, fetchImpl: impl });
    assert.deepEqual(JSON.parse(r.text), { a: 1 });
    assert.equal(r.model, 'nvidia/nemotron-3-ultra-550b-a55b:free');
    // response_format only for models that list it
    assert.deepEqual(calls[0].body.response_format, { type: 'json_object' });
    assert.equal(calls[1].body.response_format, undefined);
  });

  it('sends attribution headers and never puts the key in the body', async () => {
    const { impl, calls } = mockFetch([reply('ok')]);
    await runJob('summary', [{ role: 'user', content: 'x' }], { env: KEY_ENV, fetchImpl: impl });
    assert.equal(calls[0].headers['X-Title'], 'Identity Prism');
    assert.ok(calls[0].headers['HTTP-Referer']);
    assert.ok(!JSON.stringify(calls[0].body).includes('test-key'));
  });

  it('parseTolerantJson handles prose around JSON', () => {
    assert.deepEqual(parseTolerantJson('Here: {"k":[1,2]} done'), { k: [1, 2] });
    assert.equal(parseTolerantJson('nope'), undefined);
  });
});

describe('no-key fallback', () => {
  it('OpenRouter is disabled without a key, so legacy Groq/Gemini/gateway path is used', () => {
    assert.equal(isOpenRouterEnabled({} as any), false);
    assert.equal(isOpenRouterEnabled({ OPENROUTER_API_KEY: '  ' } as any), false);
    assert.equal(isOpenRouterEnabled({ OPENROUTER_API_KEY: 'k' } as any), true);
  });

  it('runJob refuses to run without a key', async () => {
    await assert.rejects(runJob('ask', [], { env: {} as any }), /OPENROUTER_API_KEY/);
  });
});
