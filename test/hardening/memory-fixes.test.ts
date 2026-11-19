import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSignals } from '../../src/lib/processing/signals';
import { computePatterns, buildPatternInsights } from '../../src/lib/processing/intelligence';
import { rerank, rerankConfigFromEnv, recencyFactor } from '../../src/lib/memory/rerank';
import { assertEmbeddingDimensions, isPermanentEmbedFailure } from '../../src/lib/memory/embeddings';

const pkt = (o: Record<string, any> = {}) =>
  ({ id: 'p1', source: 'manual', content: 'nothing special here', confidence: 0.9, event_time: new Date(), metadata: {}, ...o }) as any;
const types = (p: any) => extractSignals(p).map((s) => s.type);

test('signals: creation, health, finance, consumption rules', () => {
  assert.ok(types(pkt({ content: 'I published and shipped the new design today' })).includes('creation'));
  assert.ok(types(pkt({ content: 'Morning workout and a long run, slept well' })).includes('health'));
  assert.ok(types(pkt({ content: 'Paid the invoice, $1200 budget approved' })).includes('finance'));
  assert.ok(types(pkt({ content: 'Watched an episode of a podcast' })).includes('consumption'));
  assert.deepEqual(types(pkt()), []);
});

test('assertEmbeddingDimensions throws a permanent-classified error', () => {
  assert.doesNotThrow(() => assertEmbeddingDimensions([new Array(1536).fill(0), null]));
  try {
    assertEmbeddingDimensions([new Array(768).fill(0)]);
    assert.fail('should throw');
  } catch (e: any) {
    assert.equal(isPermanentEmbedFailure(e.message), true);
  }
});

const cfgOn = { mmr: true, lambda: 0.5, recencyWeight: 0.1, recencyHalfLifeDays: 90 };
const now = new Date('2026-01-01T00:00:00Z');

test('rerank: MMR demotes a near-duplicate in favour of a diverse hit', () => {
  const out = rerank(
    [
      { packet_id: 'a', score: 0.9, vector: [1, 0] },
      { packet_id: 'b', score: 0.89, vector: [1, 0.001] },
      { packet_id: 'c', score: 0.8, vector: [0, 1] },
    ],
    cfgOn, 3, now,
  );
  assert.deepEqual(out.map((x) => x.packet_id), ['a', 'c', 'b']);
});

test('rerank: MMR off keeps score order; deterministic on ties', () => {
  const cands = [
    { packet_id: 'b', score: 0.5, vector: [1, 0] },
    { packet_id: 'a', score: 0.5, vector: [1, 0] },
  ];
  const off = { ...cfgOn, mmr: false, recencyWeight: 0 };
  assert.deepEqual(rerank(cands, off, 2, now).map((x) => x.packet_id), ['a', 'b']);
  assert.deepEqual(rerank([...cands].reverse(), off, 2, now).map((x) => x.packet_id), ['a', 'b']);
});

test('rerank: recency boost is mild and favours newer content', () => {
  assert.ok(recencyFactor(now, now, cfgOn) > recencyFactor('2020-01-01', now, cfgOn));
  assert.ok(recencyFactor(now, now, cfgOn) <= 1.1 + 1e-9);
  const out = rerank(
    [
      { packet_id: 'old', score: 0.81, timestamp: '2020-01-01' },
      { packet_id: 'new', score: 0.80, timestamp: now.toISOString() },
    ],
    { ...cfgOn, mmr: false }, 2, now,
  );
  assert.equal(out[0].packet_id, 'new');
});

test('rerankConfigFromEnv defaults on, and can be disabled', () => {
  assert.equal(rerankConfigFromEnv({}).mmr, true);
  assert.equal(rerankConfigFromEnv({ RETRIEVAL_MMR: '0' }).mmr, false);
});

test('patterns: weekday, source concentration, dominant type, insights', () => {
  // 2026-01-05 is a Monday; spread hours 8..13
  const sigs = Array.from({ length: 12 }, (_, i) => ({
    timestamp: new Date(Date.UTC(2026, 0, 5 + (i % 2 ? 0 : 1), 8 + (i % 6))),
    type: i < 8 ? 'work_activity' : 'learning',
    source: i < 9 ? 'github' : 'email',
  }));
  const found = computePatterns(sigs);
  const kinds = found.map((p) => p.type);
  for (const k of ['peak_activity_time', 'weekday_rhythm', 'source_concentration', 'dominant_signal_type']) {
    assert.ok(kinds.includes(k), `missing ${k}`);
  }
  assert.deepEqual(computePatterns(sigs.slice(0, 5)), []);
  const insights = buildPatternInsights(found.map((p) => ({ ...p, window_type: '7d', signal_count: sigs.length })));
  assert.equal(insights.length, found.length);
  assert.ok(insights.every((i) => i.text.length > 10));
});
