import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decide, yesNo, choice, score, parseAnswer, deciderModels, DECIDER_ENDPOINT } from '../../src/lib/ai/decider.ts';
import { applySignalImportance } from '../../src/lib/processing/signal-importance.ts';
import { resolveMode } from '../../src/lib/cognitive/mode/decider-mode.ts';
import { createJobClient } from '../../src/lib/ai/job-client.ts';

const ENV = { OPENROUTER_API_KEY: 'test-key' } as NodeJS.ProcessEnv;

function mock(responses: Array<Response | Error>) {
  const calls: Array<{ url: string; body: any; headers: any }> = [];
  const impl = (async (url: string, init: any) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    const n = responses.shift();
    if (!n) throw new Error('unexpected extra call');
    if (n instanceof Error) throw n;
    return n;
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

// The budget guard reads/records usage; inject an empty in-memory store so these tests need no database.
const emptyStore = { load: async () => ({}), record: async () => {} };

describe('decider client', () => {
  it('does nothing and returns fallbacks without a key', async () => {
    const { impl, calls } = mock([]);
    const env = {} as NodeJS.ProcessEnv;
    assert.deepEqual(await yesNo('x', 'q', { env, fetchImpl: impl, fallback: 0.7 }), { ok: false, probability: 0.7, reason: 'no_key' });
    assert.equal((await choice('x', 'q', { a: '1', b: '2' }, { env, fetchImpl: impl })).choice, 'a');
    assert.equal((await score('x', 'q', ['l', 'm', 'h'], { env, fetchImpl: impl })).score, 1);
    assert.equal(calls.length, 0);
  });

  it('posts the documented request shape and parses a noul answer', async () => {
    const { impl, calls } = mock([json({ model: 'm-1', answers: { q: { type: 'noul', noul: 0.82 } } })]);
    const r = await yesNo({ a: 1 }, 'Is it?', { env: ENV, fetchImpl: impl });
    assert.equal(r.ok, true);
    assert.equal(r.probability, 0.82);
    assert.equal(calls[0].url, DECIDER_ENDPOINT);
    assert.equal(calls[0].body.model, 'perplexity/pplx-decider-flash-v1.3:free');
    assert.deepEqual(calls[0].body.state, { a: 1 });
    assert.equal(calls[0].body.questions.q.type, 'noul');
    assert.equal(calls[0].headers.Authorization, 'Bearer test-key');
  });

  it('parses choice and score answers', async () => {
    const c = mock([json({ answers: { q: { type: 'choice', choice: 'b', probabilities: { a: 0.1, b: 0.9 } } } })]);
    const cr = await choice('s', 'q', { a: 'A', b: 'B' }, { env: ENV, fetchImpl: c.impl });
    assert.equal(cr.choice, 'b');
    assert.equal(cr.probabilities?.b, 0.9);
    const s = mock([json({ answers: { q: { type: 'score', score: 1.99, confidence: 0.9 } } })]);
    const sr = await score('s', 'q', ['a', 'b', 'c'], { env: ENV, fetchImpl: s.impl });
    assert.equal(sr.score, 1.99);
    assert.equal(s.calls[0].body.questions.q.criteria.length, 3);
  });

  it('falls to the next model on 429 and gives up with a safe default', async () => {
    const a = mock([json({}, 429), json({ answers: { q: { type: 'noul', noul: 0.4 } } })]);
    const r = await yesNo('s', 'q', { env: ENV, fetchImpl: a.impl });
    assert.equal(r.probability, 0.4);
    assert.equal(a.calls[1].body.model, 'perplexity/pplx-decider-v1.3:free');
    const b = mock([json({}, 500), new Error('boom')]);
    const f = await yesNo('s', 'q', { env: ENV, fetchImpl: b.impl, fallback: 0.9 });
    assert.deepEqual([f.ok, f.probability], [false, 0.9]);
  });

  it('tolerates refusals, mismatched types, bad choices and junk', async () => {
    assert.equal(parseAnswer({ type: 'weird' }), undefined);
    assert.equal(parseAnswer(null), undefined);
    assert.equal((parseAnswer({ type: 'noul', noul: 7 }) as any).noul, 1);
    const r = mock([json({ answers: { q: { type: 'refusal' } } }), json({ answers: { q: { type: 'refusal' } } })]);
    assert.equal((await yesNo('s', 'q', { env: ENV, fetchImpl: r.impl })).ok, false);
    const bad = mock([json({ answers: { q: { type: 'choice', choice: 'zzz' } } })]);
    const c = await choice('s', 'q', { a: 'A', b: 'B' }, { env: ENV, fetchImpl: bad.impl, fallback: 'b' });
    assert.deepEqual([c.ok, c.choice], [false, 'b']);
    const junk = mock([json({ nope: 1 }), new Response('not json', { status: 200 })]);
    assert.equal((await decide('s', { q: { type: 'noul' } }, { env: ENV, fetchImpl: junk.impl })).reason, 'invalid_response');
  });

  it('honours DECIDER_MODELS', () => {
    assert.deepEqual(deciderModels({ DECIDER_MODELS: ' a:free, b:free ' } as any), ['a:free', 'b:free']);
  });
});

describe('decider wiring (flags)', () => {
  const sigs = [
    { type: 'work_activity', category: 'engineering' },
    { type: 'learning', category: 'research' },
    { type: 'communication', category: 'broadcast' },
  ];

  it('signals: off by default and with no key', async () => {
    const { impl, calls } = mock([]);
    assert.equal((await applySignalImportance('c', sigs, { env: ENV, fetchImpl: impl })).length, 3);
    assert.equal((await applySignalImportance('c', sigs, { env: { DECIDER_SIGNALS: '1' } as any, fetchImpl: impl })).length, 3);
    assert.equal(calls.length, 0);
  });

  it('signals: drops below threshold, keeps primary, tags importance, keeps all on failure', async () => {
    const env = { ...ENV, DECIDER_SIGNALS: '1' } as NodeJS.ProcessEnv;
    const ok = mock([json({ answers: { s0: { type: 'noul', noul: 0.05 }, s1: { type: 'noul', noul: 0.05 }, s2: { type: 'noul', noul: 0.8 } } })]);
    const out = await applySignalImportance('c', sigs, { env, fetchImpl: ok.impl, store: emptyStore });
    assert.deepEqual(out.map((s) => s.type), ['work_activity', 'communication']);
    assert.equal((out[1] as any).metadata.decider_importance, 0.8);
    assert.equal(Object.keys(ok.calls[0].body.questions).length, 3);
    const fail = mock([json({}, 500), json({}, 500)]);
    assert.equal((await applySignalImportance('c', sigs, { env, fetchImpl: fail.impl, store: emptyStore })).length, 3);
  });

  it('mode: explicit valid mode is never routed; flag off keeps fallback', async () => {
    const { impl, calls } = mock([]);
    const env = { ...ENV, DECIDER_MODE: '1' } as NodeJS.ProcessEnv;
    assert.deepEqual(await resolveMode('founder', {}, { env, fetchImpl: impl }), { mode: 'founder', routed: false });
    assert.deepEqual(await resolveMode('auto', {}, { env: ENV, fetchImpl: impl }), { mode: 'architect', routed: false });
    assert.equal(calls.length, 0);
  });

  it('mode: auto is routed via choice, falls back on failure', async () => {
    const env = { ...ENV, DECIDER_MODE: '1' } as NodeJS.ProcessEnv;
    const ok = mock([json({ answers: { q: { type: 'choice', choice: 'operator' } } })]);
    const r = await resolveMode('auto', { externalInput: 'ship today' }, { env, fetchImpl: ok.impl });
    assert.deepEqual([r.mode, r.routed], ['operator', true]);
    assert.deepEqual(Object.keys(ok.calls[0].body.questions.q.criteria), ['architect', 'founder', 'operator']);
    const bad = mock([json({}, 500), json({}, 500)]);
    assert.deepEqual(await resolveMode(undefined, {}, { env, fetchImpl: bad.impl }), { mode: 'architect', routed: false });
  });
});

describe('job client adapter', () => {
  it('maps LangChain-style messages to chat roles and exposes the answering model', async () => {
    const { impl, calls } = mock([json({ choices: [{ message: { content: '{"entities":[]}' } }] })]);
    const client = createJobClient('ingest', { env: ENV, fetchImpl: impl, store: emptyStore });
    const out = await client.call([
      { content: 'sys', _getType: () => 'system' },
      { content: 'hi', _getType: () => 'human' },
    ]);
    assert.equal(out.content, '{"entities":[]}');
    assert.deepEqual(calls[0].body.messages.map((m: any) => m.role), ['system', 'user']);
    assert.equal(client.lastModel, calls[0].body.model);
  });
});
