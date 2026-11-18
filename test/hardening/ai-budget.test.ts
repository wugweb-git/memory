import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runJob, JobFailedError } from '../../src/lib/ai/openrouter.ts';

const KEY_ENV = { OPENROUTER_API_KEY: 'test-key' } as NodeJS.ProcessEnv;
const msgs = [{ role: 'user' as const, content: 'hi' }];

function ok(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe('runJob budget and abort handling', () => {
  it('stops trying new models once the total budget is spent', async () => {
    let calls = 0;
    const impl = (async (_u: string, init: any) => {
      calls++;
      // Hang until this attempt's own timeout aborts it.
      await new Promise((_r, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
      return ok('never');
    }) as unknown as typeof fetch;
    const started = Date.now();
    await assert.rejects(
      runJob('ask', msgs, { env: KEY_ENV, fetchImpl: impl, timeoutMs: 3500, budgetMs: 7000 }),
      (e: unknown) => e instanceof JobFailedError,
    );
    assert.ok(Date.now() - started < 8500, 'whole chain must fit the budget');
    assert.ok(calls <= 2, `expected at most 2 attempts, got ${calls}`);
  });

  it('does not call the network when the signal is already aborted', async () => {
    let calls = 0;
    const impl = (async () => { calls++; return ok('x'); }) as unknown as typeof fetch;
    const ctrl = new AbortController();
    ctrl.abort();
    await assert.rejects(runJob('ask', msgs, { env: KEY_ENV, fetchImpl: impl, signal: ctrl.signal }));
    assert.equal(calls, 0);
  });

  it('removes its abort listener after each attempt', async () => {
    const ctrl = new AbortController();
    let added = 0;
    let removed = 0;
    const sig = ctrl.signal;
    const origAdd = sig.addEventListener.bind(sig);
    const origRemove = sig.removeEventListener.bind(sig);
    (sig as any).addEventListener = (t: string, l: any, o: any) => { added++; return origAdd(t, l, o); };
    (sig as any).removeEventListener = (t: string, l: any, o: any) => { removed++; return origRemove(t, l, o); };
    const impl = (async () => ok('fine')) as unknown as typeof fetch;
    const r = await runJob('ask', msgs, { env: KEY_ENV, fetchImpl: impl, signal: sig });
    assert.equal(r.text, 'fine');
    assert.equal(added, 1);
    assert.equal(removed, 1);
  });
});
