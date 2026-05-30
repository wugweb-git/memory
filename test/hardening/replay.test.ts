import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseBlobItems } from '../../src/lib/ui/blob.ts';

describe('replay / blob contracts', () => {
  it('parses legacy array blob payloads', () => {
    const items = parseBlobItems([{ id: 'a' }, { id: 'b' }]);
    assert.equal(items.length, 2);
  });

  it('parses wrapped { items } blob payloads', () => {
    const items = parseBlobItems({ items: [{ id: 'x' }] });
    assert.deepEqual(items, [{ id: 'x' }]);
  });

  it('returns empty array for invalid payloads', () => {
    assert.deepEqual(parseBlobItems(null), []);
    assert.deepEqual(parseBlobItems({}), []);
  });
});
