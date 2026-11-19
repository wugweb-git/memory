import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocusIndex, buildRollbackDescription } from '../../src/components/ui/confirm-dialog.tsx';

describe('confirm dialog helpers', () => {
  it('cycles focus forward and wraps', () => {
    assert.equal(nextFocusIndex(0, 2, false), 1);
    assert.equal(nextFocusIndex(1, 2, false), 0);
  });
  it('cycles focus backward and wraps', () => {
    assert.equal(nextFocusIndex(1, 2, true), 0);
    assert.equal(nextFocusIndex(0, 2, true), 1);
  });
  it('enters the trap from outside', () => {
    assert.equal(nextFocusIndex(-1, 3, false), 0);
    assert.equal(nextFocusIndex(-1, 3, true), 2);
  });
  it('returns -1 with nothing focusable', () => {
    assert.equal(nextFocusIndex(0, 0, false), -1);
  });
  it('names the field and the date in the rollback description', () => {
    const d = buildRollbackDescription('Writing', '3/4/2026');
    assert.match(d, /writing/);
    assert.match(d, /3\/4\/2026/);
    assert.match(d, /timeline/);
  });
  it('falls back without a date', () => {
    assert.match(buildRollbackDescription('Decision-making', null), /before this change/);
  });
});
