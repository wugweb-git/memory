import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSignals } from '../../src/lib/processing/signals';

// Minimal packet shape; extractSignals only reads source/content/metadata/id/confidence/event_time.
function packet(overrides: Record<string, any> = {}) {
  return {
    id: 'pkt-1',
    source: 'email',
    content: 'Hello team, notes on the project meeting tomorrow',
    confidence: 0.8,
    event_time: new Date(),
    metadata: { subject: 'Project meeting agenda', thread_id: 't1' },
    ...overrides,
  } as any;
}

test('email source yields a communication signal (old rule only matched gmail → dead on real data)', () => {
  const types = extractSignals(packet()).map((s) => s.type);
  assert.ok(types.includes('communication'), `expected communication, got [${types.join(', ')}]`);
});

test('email with a work subject also yields work_activity', () => {
  const types = extractSignals(packet()).map((s) => s.type);
  assert.ok(types.includes('work_activity'), `expected work_activity, got [${types.join(', ')}]`);
});

test('legacy gmail source still produces communication', () => {
  const types = extractSignals(packet({ source: 'gmail' })).map((s) => s.type);
  assert.ok(types.includes('communication'));
});

test('a non-mail source produces no communication signal', () => {
  const types = extractSignals(
    packet({ source: 'rss', content: 'weather update for the weekend', metadata: {} }),
  ).map((s) => s.type);
  assert.ok(!types.includes('communication'));
});

import { mapGmailMessage } from '../../src/lib/connectors/google-extra';
import { mapPlay } from '../../src/lib/connectors/spotify';

test('gmail messages keep subject, snippet and thread but never the body', () => {
  const item = mapGmailMessage({
    id: 'm1', threadId: 't1', snippet: 'Quick sync?', labelIds: ['INBOX'],
    payload: { headers: [{ name: 'Subject', value: 'Project sync' }, { name: 'From', value: 'a@b.c' }, { name: 'Date', value: 'Mon' }], body: { data: 'SECRET' } },
  });
  assert.equal(item?.sourceId, 'gmail:m1');
  assert.equal((item?.payload as any).thread_id, 't1');
  assert.ok(!JSON.stringify(item).includes('SECRET'));
});

test('spotify plays map to a listening item and skip incomplete rows', () => {
  const item = mapPlay({ played_at: '2026-11-19T01:00:00Z', track: { id: 'x', name: 'Song', artists: [{ name: 'Band' }], album: { name: 'LP' } } });
  assert.equal(item?.type, 'spotify_play');
  assert.match(String((item?.payload as any).text), /Song by Band/);
  assert.equal(mapPlay({ track: { id: 'x' } }), null);
});
