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
