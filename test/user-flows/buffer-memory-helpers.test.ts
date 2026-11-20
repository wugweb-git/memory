import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('promote outcome', () => {
  it('branches on ingest_status', async () => {
    const { describePromoteOutcome: d } = await import('../../src/app/buffer/promote-outcome.ts');
    assert.deepEqual(d({ ingest_status: 'ACCEPTED' }), { closed: true, tone: 'success', message: 'Promoted to memory.' });
    const hold = d({ ingest_status: 'HOLD', reason: 'low trust' });
    assert.equal(hold.closed, false);
    assert.equal(hold.message, 'Held for review: low trust');
    const f = d({ ingest_status: 'FILTERED', reason: 'duplicate' });
    assert.equal(f.closed, true);
    assert.equal(f.message, 'Filtered out: duplicate');
  });
});

describe('packet status view', () => {
  it('maps real statuses', async () => {
    const { packetStatusView: v } = await import('../../src/app/memory/packet-status.ts');
    assert.equal(v('active').tone, 'success');
    assert.equal(v('partial').tone, 'warning');
    assert.equal(v('failed').tone, 'danger');
    assert.equal(v('archived').label, 'Archived');
  });
});
