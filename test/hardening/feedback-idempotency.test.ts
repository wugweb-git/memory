import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recordFeedback } from '../../src/lib/cognitive/feedback-store.ts';

const input = { decisionId: 'd1', userId: 'u1', feedbackType: 'accepted', comment: null };

describe('recordFeedback', () => {
  it('inserts when no row exists', async () => {
    const db = { feedbackLog: { findFirst: async () => null, create: async () => ({ id: 'new' }) } };
    assert.deepEqual(await recordFeedback(db, input), { id: 'new', duplicate: false });
  });

  it('treats P2002 from a racing insert as duplicate and returns the existing row', async () => {
    let finds = 0;
    const db = {
      feedbackLog: {
        // First check misses (race), post-violation lookup finds the winner.
        findFirst: async () => (++finds === 1 ? null : { id: 'winner' }),
        create: async () => { throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }); },
      },
    };
    assert.deepEqual(await recordFeedback(db, input), { id: 'winner', duplicate: true });
  });

  it('rethrows non-P2002 errors', async () => {
    const db = { feedbackLog: { findFirst: async () => null, create: async () => { throw Object.assign(new Error('x'), { code: 'P1001' }); } } };
    await assert.rejects(() => recordFeedback(db, input), /x/);
  });
});
