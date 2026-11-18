import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('shell session view', () => {
  it('maps loading, signed-out and signed-in', async () => {
    const { toSessionView } = await import('../../src/lib/auth/session-view.ts');
    assert.equal(toSessionView(false, null).state, 'loading');
    assert.equal(toSessionView(true, null).state, 'signed-out');
    assert.equal(toSessionView(true, { error: 'x' }).state, 'signed-out');
    const v = toSessionView(true, { email: 'a@b.co', role: 'owner' });
    assert.deepEqual(v, { state: 'signed-in', email: 'a@b.co', role: 'owner', initial: 'A' });
  });
});
