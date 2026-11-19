/** Journey (b): connector sync -> blob buffer (review-first) -> promote to memory. No DB or network. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ingestItems } from '../../src/lib/connectors/sync-items.ts';
import { autoPromoteFor } from '../../src/lib/ingestion/connectors/auto-promote.ts';

type State = { lastSyncAt: string | null; lastError: string | null; lastResult: unknown; seen: string[] };

function world() {
  const buffer: Array<{ id: string; source_id: string; status: 'pending' | 'promoted'; trace: any }> = [];
  const memory: string[] = [];
  const states = new Map<string, State>();
  const deps = {
    push: (async (p: any) => {
      const id = `blob-${buffer.length + 1}`;
      buffer.push({ id, source_id: p.source_id, status: 'pending', trace: p.trace_json });
      return { id };
    }) as any,
    promote: async (id: string) => {
      const b = buffer.find((x) => x.id === id)!;
      b.status = 'promoted';
      memory.push(b.source_id);
    },
    getState: (async (id: string) => states.get(id) ?? { lastSyncAt: null, lastError: null, lastResult: null, seen: [] }) as any,
    saveState: (async (id: string, patch: any) => {
      const prev = states.get(id) ?? { lastSyncAt: null, lastError: null, lastResult: null, seen: [] };
      states.set(id, { ...prev, ...patch, seen: patch.seen ?? prev.seen });
    }) as any,
  };
  return { buffer, memory, states, deps };
}

const item = (id: string) => ({ sourceId: id, type: 'note', payload: { id } });

describe('ingest journey', () => {
  it('a first sync buffers items review-first with a provenance trace; nothing reaches memory', async () => {
    const w = world();
    const r = await ingestItems({ connectorId: 'gmail', source: 'gmail', items: [item('a'), item('b')], deps: w.deps });
    assert.equal(r.ingested, 2);
    assert.deepEqual(w.memory, []);
    assert.ok(w.buffer.every((b) => b.status === 'pending'));
    assert.equal(w.buffer[0].trace.ingestion_path, 'connector/gmail');
    assert.equal(w.buffer[0].trace.input_mode, 'synced');
  });

  it('a second sync skips what it already saw (no duplicates in the buffer)', async () => {
    const w = world();
    await ingestItems({ connectorId: 'github', source: 'github', items: [item('a'), item('b')], deps: w.deps });
    const r = await ingestItems({ connectorId: 'github', source: 'github', items: [item('b'), item('c')], deps: w.deps });
    assert.equal(r.ingested, 1);
    assert.equal(r.skipped, 1);
    assert.deepEqual(w.buffer.map((b) => b.source_id), ['a', 'b', 'c']);
  });

  it('the owner can promote a buffered item later, and auto-promote mode decides per connector', async () => {
    const w = world();
    await ingestItems({ connectorId: 'gmail', source: 'gmail', items: [item('m1')], deps: w.deps });
    await w.deps.promote('blob-1');
    assert.deepEqual(w.memory, ['m1']);

    const store = { get: async () => ({ mode: 'trusted' }), set: async () => {} };
    assert.equal(await autoPromoteFor('github', store), true);
    assert.equal(await autoPromoteFor('gmail', store), false);
    const auto = world();
    await ingestItems({ connectorId: 'github', source: 'github', items: [item('x')], autoPromote: await autoPromoteFor('github', store), deps: auto.deps });
    assert.deepEqual(auto.memory, ['x']);
  });

  it('a failed promotion keeps the item pending in the buffer and the sync is not an error', async () => {
    const w = world();
    w.deps.promote = async () => { throw new Error('embedding provider down'); };
    const r = await ingestItems({ connectorId: 'spotify', source: 'spotify', items: [item('s1')], autoPromote: true, deps: w.deps });
    assert.equal(r.ingested, 1);
    assert.equal(r.error, undefined);
    assert.equal(w.buffer[0].status, 'pending');
  });

  it('respects the per-sync cap', async () => {
    const w = world();
    const many = Array.from({ length: 40 }, (_, i) => item(`i${i}`));
    const r = await ingestItems({ connectorId: 'blog', source: 'blog', items: many, max: 10, deps: w.deps });
    assert.equal(r.ingested, 10);
  });

  it('user uploads are recorded as upload, not synced', async () => {
    const w = world();
    await ingestItems({ connectorId: 'apple', source: 'apple', items: [item('u')], inputMode: 'upload', deps: w.deps });
    assert.equal(w.buffer[0].trace.input_mode, 'upload');
  });
});
