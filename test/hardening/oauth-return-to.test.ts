import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnTo } from '../../src/lib/oauth/google.ts';

test('safeReturnTo only allows same-site relative paths', () => {
  assert.equal(safeReturnTo('/integrations'), '/integrations');
  assert.equal(safeReturnTo('/system?x=1'), '/system');
  for (const bad of ['//evil.com', 'https://evil.com', '@evil.com', '/\\evil.com', null, '']) {
    assert.equal(safeReturnTo(bad as string | null), '/integrations', String(bad));
  }
});

