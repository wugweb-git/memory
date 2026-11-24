import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMemoryStats, loadMemoryStats } from '../../src/lib/stats/memory-stats';

const row = (status: string, emb: string, proc: string, embeddable: boolean, n: number) => ({
  status, embedding_status: emb, processing_status: proc, is_embeddable: embeddable, _count: { _all: n },
});

const ROWS = [
  row('active', 'embedded', 'complete', true, 8),
  row('active', 'pending', 'pending', true, 20),
  row('active', 'processing', 'pending', true, 2),
  row('active', 'failed', 'failed', true, 26),
  row('active', 'pending', 'complete', false, 5),
  row('partial', 'embedded', 'complete', true, 3),
  row('rejected', 'pending', 'pending', true, 40),
  row('archived', 'embedded', 'complete', true, 7),
];

test('total excludes rejected and archived, which are reported separately', () => {
  const s = computeMemoryStats(ROWS);
  assert.equal(s.excluded, 47);
  assert.equal(s.total, 8 + 20 + 2 + 26 + 5 + 3);
});

test('embedded + pending + processing + failed = total', () => {
  const s = computeMemoryStats(ROWS);
  assert.equal(s.embedded, 11);
  assert.equal(s.pending, 25);
  assert.equal(s.processing, 2);
  assert.equal(s.failed, 26);
  assert.equal(s.embedded + s.pending + s.processing + s.failed, s.total);
});

test('backlog counts embeddable pending plus processing, not non-embeddable packets', () => {
  const s = computeMemoryStats(ROWS);
  assert.equal(s.not_embeddable, 5);
  assert.equal(s.backlog, 22);
});

test('not_searchable is total minus embedded', () => {
  const s = computeMemoryStats(ROWS);
  assert.equal(s.not_searchable, s.total - s.embedded);
  assert.equal(s.not_searchable, 53);
});

test('needs_attention counts failed/partial status or failed embedding/processing once', () => {
  const s = computeMemoryStats(ROWS);
  // 26 failed (embedding and processing both failed: counted once) + 3 partial.
  assert.equal(s.needs_attention, 29);
  assert.equal(s.processing_failed, 26);
});

test('processing distribution only covers counted packets', () => {
  const s = computeMemoryStats(ROWS);
  const byStatus = Object.fromEntries(s.processing_distribution.map((d) => [d.processing_status, d._count]));
  assert.deepEqual(byStatus, { complete: 16, pending: 22, failed: 26 });
});

test('empty data gives zeros and accepts plain numeric counts', () => {
  const s = computeMemoryStats([]);
  assert.equal(s.total, 0);
  assert.equal(s.needs_attention, 0);
  const n = computeMemoryStats([{ status: 'active', embedding_status: 'embedded', processing_status: 'complete', is_embeddable: true, _count: 3 }]);
  assert.equal(n.total, 3);
});

test('loadMemoryStats uses a single grouped query scoped to the test run', async () => {
  let calls = 0;
  let args: any = null;
  const db: any = { memoryPacket: { groupBy: async (a: any) => { calls += 1; args = a; return ROWS; } } };
  const s = await loadMemoryStats('PROD', db);
  assert.equal(calls, 1);
  assert.deepEqual(args.where, { test_run_id: 'PROD' });
  assert.equal(s.total, 64);
});
