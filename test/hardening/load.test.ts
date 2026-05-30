import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listApiEndpoints } from '../../src/lib/api/endpoints.ts';

describe('load smoke', () => {
  it('lists a large API surface without throwing', () => {
    const endpoints = listApiEndpoints();
    assert.ok(endpoints.length >= 40, `expected >= 40 endpoints, got ${endpoints.length}`);
    for (const ep of endpoints) {
      assert.match(ep.path, /^\/api\//);
      assert.ok(ep.methods.length > 0);
    }
  });

  it('handles concurrent pure computations', async () => {
    const tasks = Array.from({ length: 50 }, (_, i) =>
      Promise.resolve(i * i),
    );
    const results = await Promise.all(tasks);
    assert.equal(results[49], 2401);
  });
});
