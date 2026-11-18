import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyStatus,
  isNetworkError,
  enqueue,
  flush,
  captureOrQueue,
  MAX_QUEUE_SIZE,
  type QueuedCapture,
  type QueueStorage,
} from '../../src/lib/pwa/capture-queue';

function memoryStorage(): QueueStorage & { items: Map<string, QueuedCapture> } {
  const items = new Map<string, QueuedCapture>();
  return {
    items,
    getAll: async () => [...items.values()].map((i) => ({ ...i })),
    put: async (i) => void items.set(i.id, { ...i }),
    remove: async (id) => void items.delete(id),
  };
}

const netFail = async (): Promise<{ status: number }> => {
  throw new TypeError('Failed to fetch');
};

test('classifyStatus', () => {
  assert.equal(classifyStatus(201), 'ok');
  assert.equal(classifyStatus(401), 'auth');
  assert.equal(classifyStatus(403), 'auth');
  assert.equal(classifyStatus(429), 'retry');
  assert.equal(classifyStatus(503), 'retry');
  assert.equal(classifyStatus(500), 'retry');
  assert.equal(classifyStatus(400), 'drop');
  assert.equal(classifyStatus(422), 'drop');
  assert.equal(classifyStatus(404), 'drop');
});

test('isNetworkError recognises fetch failures only', () => {
  assert.equal(isNetworkError(new TypeError('Failed to fetch')), true);
  assert.equal(isNetworkError(new Error('Load failed')), true);
  assert.equal(isNetworkError(new Error('boom')), false);
  assert.equal(isNetworkError('x'), false);
});

test('enqueue stores with defaults and caps queue size, dropping oldest', async () => {
  const s = memoryStorage();
  const first = await enqueue(s, { body: { a: 1 } }, 1, 'first');
  assert.equal(first.url, '/api/blob');
  assert.equal(first.attempts, 0);
  for (let i = 0; i < MAX_QUEUE_SIZE; i++) await enqueue(s, { body: i }, 10 + i, `n${i}`);
  assert.equal(s.items.size, MAX_QUEUE_SIZE);
  assert.equal(s.items.has('first'), false);
});

test('flush sends oldest first and removes sent items', async () => {
  const s = memoryStorage();
  await enqueue(s, { body: 'b' }, 2, 'b');
  await enqueue(s, { body: 'a' }, 1, 'a');
  const order: string[] = [];
  const res = await flush(s, async (i) => (order.push(i.id), { status: 201 }));
  assert.deepEqual(order, ['a', 'b']);
  assert.deepEqual(res, { sent: 2, dropped: 0, remaining: 0, authRequired: false, offline: false });
});

test('flush stops on network error and keeps everything', async () => {
  const s = memoryStorage();
  await enqueue(s, { body: 1 }, 1, 'a');
  await enqueue(s, { body: 2 }, 2, 'b');
  let calls = 0;
  const res = await flush(s, async () => {
    calls++;
    return netFail();
  });
  assert.equal(calls, 1);
  assert.equal(res.offline, true);
  assert.equal(res.remaining, 2);
});

test('flush keeps items on 401, drops permanent 4xx (422), counts attempts on 5xx', async () => {
  const s = memoryStorage();
  await enqueue(s, { body: 1 }, 1, 'bad');
  await enqueue(s, { body: 2 }, 2, 'flaky');
  const r1 = await flush(s, async (i) => ({ status: i.id === 'bad' ? 422 : 503 }));
  assert.equal(r1.dropped, 1);
  assert.equal(s.items.get('flaky')?.attempts, 1);
  const r2 = await flush(s, async () => ({ status: 401 }));
  assert.equal(r2.authRequired, true);
  assert.equal(s.items.size, 1);
  const r3 = await flush(s, async () => ({ status: 503 }), 2);
  assert.equal(r3.dropped, 1);
  assert.equal(s.items.size, 0);
});

test('captureOrQueue sends when online and queues when offline or on network error', async () => {
  const s = memoryStorage();
  const ok = await captureOrQueue(s, async () => ({ status: 201 }), { body: 'x' }, true);
  assert.equal(ok.kind, 'sent');
  assert.equal(s.items.size, 0);

  const offline = await captureOrQueue(s, async () => assert.fail('must not send'), { body: 'y' }, false);
  assert.equal(offline.kind, 'queued');
  assert.equal(s.items.size, 1);

  const err = await captureOrQueue(s, netFail, { body: 'z' }, true);
  assert.equal(err.kind, 'queued');
  assert.equal(s.items.size, 2);
});

test('captureOrQueue: rejection not queued, auth and 5xx queued, no storage rethrows', async () => {
  const s = memoryStorage();
  assert.deepEqual(await captureOrQueue(s, async () => ({ status: 422 }), { body: 1 }, true), { kind: 'rejected', status: 422 });
  assert.equal(s.items.size, 0);
  assert.equal((await captureOrQueue(s, async () => ({ status: 401 }), { body: 1 }, true)).kind, 'queued');
  assert.equal((await captureOrQueue(s, async () => ({ status: 502 }), { body: 1 }, true)).kind, 'queued');
  await assert.rejects(captureOrQueue(null, netFail, { body: 1 }, true));
});
