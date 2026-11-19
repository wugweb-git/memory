import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTopics } from '../../src/lib/semantic/topics';
import { buildGraphEdges } from '../../src/lib/semantic/graph';
import { normalizeEntityName } from '../../src/lib/semantic/dedup';
import { runFallbackExtraction } from '../../src/lib/semantic/fallback';
import { mapVectorHits } from '../../src/lib/semantic/search';

test('aggregateTopics merges by name and handles topic/name keys', () => {
  const out = aggregateTopics([
    { packet_id: 'a', topics: [{ topic: 'AI', confidence: 0.8 }] },
    { packet_id: 'b', topics: [{ name: 'ai', confidence: 0.6, fallback: true }, { name: 'x', confidence: 0.3, fallback: true }] },
  ]);
  assert.equal(out[0].name, 'AI');
  assert.equal(out[0].mentions, 2);
  assert.equal(out[0].inferred, false);
  assert.equal(out.find((t) => t.name === 'x')?.inferred, true);
});

test('graph prefers real relationships; co-occurrence only as flagged fallback', () => {
  const ents = [{ id: '1', packet_ids: ['p'] }, { id: '2', packet_ids: ['p'] }];
  const real = buildGraphEdges([{ from_entity_id: '1', to_entity_id: '2', type: 'uses', confidence: 0.9 }], ents);
  assert.equal(real[0].inferred, false);
  const inf = buildGraphEdges([], ents);
  assert.equal(inf.length, 1);
  assert.equal(inf[0].inferred, true);
});

test('normalizeEntityName dedups punctuation/suffix/case variants', () => {
  assert.equal(normalizeEntityName('Acme, Inc.'), normalizeEntityName('acme'));
  assert.equal(normalizeEntityName('  Café  Noir '), 'cafe noir');
});

test('fallback produces topics and co-mention relationships at low confidence', () => {
  const r = runFallbackExtraction('Alice Smith met Bob Jones about pricing strategy. The pricing strategy needs pricing work.');
  assert.ok(r.entities.length >= 2);
  assert.ok(r.topics.some((t) => t.name === 'pricing'));
  assert.ok(r.relationships.length > 0);
  assert.ok([...r.entities, ...r.topics, ...r.relationships.map((x) => ({ confidence: x.weight }))].every((x) => x.confidence < 0.5));
});

test('mapVectorHits keeps hits without semantic objects', () => {
  const out = mapVectorHits([{ packet_id: 'p', context: ['hi'], score: 0.9 }], []);
  assert.equal(out[0].id, 'p');
});
