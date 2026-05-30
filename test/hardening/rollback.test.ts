import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BLOB_ACTION_ROUTES } from '../../src/lib/ui/blob.ts';

describe('rollback safety', () => {
  it('maps only known blob actions to dedicated routes', () => {
    assert.equal(BLOB_ACTION_ROUTES.promote, '/api/blob/promote');
    assert.equal(BLOB_ACTION_ROUTES.reject, '/api/blob/reject');
    assert.equal(Object.keys(BLOB_ACTION_ROUTES).length, 4);
  });

  it('rejects unknown action keys at route lookup', () => {
    assert.equal(BLOB_ACTION_ROUTES['unknown' as keyof typeof BLOB_ACTION_ROUTES], undefined);
  });
});
