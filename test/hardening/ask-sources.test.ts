import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAskSources,
  buildSourceLabel,
  buildSourcesHeader,
  parseSourcesHeader,
  MAX_ASK_SOURCES,
  MAX_SOURCES_HEADER_CHARS,
} from '../../src/lib/chat/sources';

const hit = (id: string, text: string, source = 'notes') => ({
  packet_id: id,
  source,
  score: 0.91,
  timestamp: '2026-01-01',
  context: [text, 'second chunk that must never leak'],
});

test('label: source plus first 80 chars of chunk, whitespace collapsed', () => {
  const label = buildSourceLabel(hit('p1', 'Line one\n\n  line   two ' + 'x'.repeat(200)));
  assert.ok(label.startsWith('notes: Line one line two xxx'));
  assert.ok(label.length <= 'notes: '.length + 81);
  assert.ok(!label.includes('second chunk'));
  assert.ok(!/\s{2}/.test(label));
});

test('label: title preferred; fallback when nothing is known', () => {
  assert.equal(buildSourceLabel({ packet_id: 'a', source: 'blog', title: 'My post', context: ['body'] }), 'blog: My post');
  assert.equal(buildSourceLabel({ packet_id: 'a' }), 'Public note');
});

test('buildAskSources dedupes by packet_id and caps at 4', () => {
  const hits = [hit('a', 'A'), hit('a', 'A again'), hit('b', 'B'), hit('c', 'C'), hit('d', 'D'), hit('e', 'E'), hit('f', 'F')];
  const out = buildAskSources(hits);
  assert.deepEqual(out.map((s) => s.packet_id), ['a', 'b', 'c', 'd']);
  assert.equal(out.length, MAX_ASK_SOURCES);
});

test('buildAskSources ignores garbage and non-arrays', () => {
  assert.deepEqual(buildAskSources(undefined), []);
  assert.deepEqual(buildAskSources({ results: [] }), []);
  assert.deepEqual(buildAskSources([null, 3, { source: 'x' }, { packet_id: '' }]), []);
});

test('round trip preserves label and packet_id, including unicode', () => {
  const sources = buildAskSources([hit('p1', 'Café ☕ notes — résumé'), hit('p2', 'Second')]);
  const header = buildSourcesHeader(sources);
  assert.ok(header);
  assert.match(header!, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(parseSourcesHeader(header), sources);
});

test('output contains only label and packet_id (no scores, chunks, timestamps)', () => {
  const sources = buildAskSources([hit('p1', 'Hello')]);
  assert.deepEqual(Object.keys(sources[0]).sort(), ['label', 'packet_id']);
  const header = buildSourcesHeader([{ ...sources[0], score: 0.9, text_chunk: 'secret' } as never])!;
  const decoded = Buffer.from(header, 'base64url').toString('utf8');
  assert.ok(!decoded.includes('score'));
  assert.ok(!decoded.includes('secret'));
  assert.deepEqual(Object.keys(JSON.parse(decoded)[0]).sort(), ['label', 'packet_id']);
});

test('no sources -> no header', () => {
  assert.equal(buildSourcesHeader([]), null);
  assert.equal(buildSourcesHeader(buildAskSources([])), null);
});

test('cap drops trailing sources and never exceeds the limit', () => {
  const big = Array.from({ length: 4 }, (_, i) => ({ label: 'é'.repeat(300) + i, packet_id: `p${i}` }));
  const header = buildSourcesHeader(big)!;
  assert.ok(header.length <= MAX_SOURCES_HEADER_CHARS);
  const parsed = parseSourcesHeader(header);
  assert.ok(parsed.length >= 1 && parsed.length < 4);
  assert.deepEqual(parsed.map((s) => s.packet_id), big.slice(0, parsed.length).map((s) => s.packet_id));
  assert.equal(buildSourcesHeader([{ label: 'x'.repeat(5000), packet_id: 'p' }]), null);
});

test('parse rejects malformed input safely', () => {
  assert.deepEqual(parseSourcesHeader(null), []);
  assert.deepEqual(parseSourcesHeader(''), []);
  assert.deepEqual(parseSourcesHeader('!!!not-base64'), []);
  assert.deepEqual(parseSourcesHeader(Buffer.from('{"a":1}').toString('base64url')), []);
  assert.deepEqual(parseSourcesHeader(Buffer.from('[{"label":1,"packet_id":"x"},{"label":"ok","packet_id":"y"}]').toString('base64url')), [
    { label: 'ok', packet_id: 'y' },
  ]);
});
