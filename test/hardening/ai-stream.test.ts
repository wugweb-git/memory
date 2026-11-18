import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { streamJob, JobFailedError } from '../../src/lib/ai/openrouter.ts';

const ENV = { OPENROUTER_API_KEY: 'test-key' } as NodeJS.ProcessEnv;
const msgs = [{ role: 'user' as const, content: 'hi' }];

const enc = new TextEncoder();
const frame = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;

/** SSE response whose body emits the given string chunks (split anywhere, as a real network would). */
function sse(chunks: string[], opts: { hang?: boolean; status?: number } = {}): Response {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (i < chunks.length) {
        ctrl.enqueue(enc.encode(chunks[i++]));
        return;
      }
      if (opts.hang) return new Promise<void>(() => {});
      ctrl.close();
    },
  });
  return new Response(body, { status: opts.status ?? 200, headers: { 'Content-Type': 'text/event-stream' } });
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const d of gen) out.push(d);
  return out;
}

const modelOf = (init: any) => JSON.parse(init.body).model as string;

describe('streamJob', () => {
  it('yields text deltas, ignores comments, split frames and [DONE]', async () => {
    const f1 = frame('Hel');
    const impl = (async (_u: string, init: any) => {
      const b = JSON.parse(init.body);
      assert.equal(b.stream, true);
      return sse([': OPENROUTER PROCESSING\n\n', f1.slice(0, 10), f1.slice(10), frame('lo'), frame(''), 'data: [DONE]\n\n']);
    }) as unknown as typeof fetch;
    let model = '';
    const out = await collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl, onModel: (m) => (model = m) }));
    assert.deepEqual(out, ['Hel', 'lo']);
    assert.ok(model.length > 0);
  });

  it('falls back before the first token (429, empty stream, no tokens)', async () => {
    const tried: string[] = [];
    const impl = (async (_u: string, init: any) => {
      tried.push(modelOf(init));
      if (tried.length === 1) return new Response('{}', { status: 429 });
      if (tried.length === 2) return sse(['data: [DONE]\n\n']);
      return sse([frame('ok'), 'data: [DONE]\n\n']);
    }) as unknown as typeof fetch;
    let model = '';
    let attempts: any[] = [];
    const out = await collect(
      streamJob('ask', msgs, { env: ENV, fetchImpl: impl, onModel: (m) => (model = m), onAttempts: (a) => (attempts = a) }),
    );
    assert.deepEqual(out, ['ok']);
    assert.equal(tried.length, 3);
    assert.equal(model, tried[2]);
    assert.deepEqual(attempts.map((a) => a.reason ?? 'ok'), ['rate_limited', 'empty', 'ok']);
  });

  it('falls back when a model errors before its first token', async () => {
    let n = 0;
    const impl = (async () => {
      n++;
      if (n === 1) return sse([`data: ${JSON.stringify({ error: { message: 'boom' } })}\n\n`]);
      return sse([frame('fine'), 'data: [DONE]\n\n']);
    }) as unknown as typeof fetch;
    assert.deepEqual(await collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl })), ['fine']);
    assert.equal(n, 2);
  });

  it('never switches models after a token: a later failure just ends the stream', async () => {
    let calls = 0;
    const impl = (async () => {
      calls++;
      // one token, then an upstream error frame
      return sse([frame('par'), `data: ${JSON.stringify({ error: { message: 'cut' } })}\n\n`]);
    }) as unknown as typeof fetch;
    assert.deepEqual(await collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl })), ['par']);
    assert.equal(calls, 1);
  });

  it('never switches models when the body errors after a token', async () => {
    let calls = 0;
    const impl = (async () => {
      calls++;
      let sent = false;
      const body = new ReadableStream<Uint8Array>({
        pull(ctrl) {
          if (!sent) {
            sent = true;
            ctrl.enqueue(enc.encode(frame('abc')));
            return;
          }
          ctrl.error(new Error('socket reset'));
        },
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;
    assert.deepEqual(await collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl })), ['abc']);
    assert.equal(calls, 1);
  });

  it('throws JobFailedError when every model fails before any token', async () => {
    const impl = (async () => new Response('x', { status: 500 })) as unknown as typeof fetch;
    await assert.rejects(
      collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl })),
      (e: unknown) => e instanceof JobFailedError,
    );
  });

  it('does not touch the network when the signal is already aborted, and cleans listeners', async () => {
    let calls = 0;
    const impl = (async () => { calls++; return sse([frame('x')]); }) as unknown as typeof fetch;
    const pre = new AbortController();
    pre.abort();
    await assert.rejects(collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl, signal: pre.signal })));
    assert.equal(calls, 0);

    const ctrl = new AbortController();
    const sig = ctrl.signal;
    let added = 0;
    let removed = 0;
    const origAdd = sig.addEventListener.bind(sig);
    const origRemove = sig.removeEventListener.bind(sig);
    (sig as any).addEventListener = (t: string, l: any, o: any) => { added++; return origAdd(t, l, o); };
    (sig as any).removeEventListener = (t: string, l: any, o: any) => { removed++; return origRemove(t, l, o); };
    const ok = (async () => sse([frame('fine'), 'data: [DONE]\n\n'])) as unknown as typeof fetch;
    await collect(streamJob('ask', msgs, { env: ENV, fetchImpl: ok, signal: sig }));
    assert.ok(added >= 1);
    assert.equal(added, removed);
  });

  it('cancels the upstream body and cleans up when the consumer stops early', async () => {
    let cancelled = false;
    const impl = (async () => {
      const body = new ReadableStream<Uint8Array>({
        pull(ctrl) { ctrl.enqueue(enc.encode(frame('a'))); },
        cancel() { cancelled = true; },
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;
    const ctrl = new AbortController();
    const gen = streamJob('ask', msgs, { env: ENV, fetchImpl: impl, signal: ctrl.signal });
    const first = await gen.next();
    assert.equal(first.value, 'a');
    await gen.return();
    assert.equal(cancelled, true);
  });

  it('first-token timeout falls to the next model; budget caps the chain', async () => {
    let calls = 0;
    const impl = (async (_u: string, init: any) => {
      calls++;
      return new Promise<Response>((_r, rej) =>
        init.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
    }) as unknown as typeof fetch;
    const started = Date.now();
    await assert.rejects(
      collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl, timeoutMs: 3500, budgetMs: 7000 })),
      (e: unknown) => e instanceof JobFailedError,
    );
    assert.ok(Date.now() - started < 8500);
    assert.ok(calls >= 1 && calls <= 2, `calls=${calls}`);
  });

  it('after the first token only the total budget applies (no per-attempt cutoff, no model switch)', async () => {
    let calls = 0;
    const impl = (async () => {
      calls++;
      return sse([frame('hi')], { hang: true }); // one token then stalls
    }) as unknown as typeof fetch;
    const started = Date.now();
    // timeoutMs would cut at 3.2s, but the first token cancelled it; total budget 3500ms ends the stream.
    const out = await collect(streamJob('ask', msgs, { env: ENV, fetchImpl: impl, timeoutMs: 3200, budgetMs: 3500 }));
    assert.deepEqual(out, ['hi']);
    assert.equal(calls, 1);
    assert.ok(Date.now() - started < 5000);
  });
});
