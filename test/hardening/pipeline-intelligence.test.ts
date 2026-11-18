import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runL2Intelligence } from '../../src/jobs/memory-pipeline';

// A past deadline must short-circuit before any engine/prisma call, so this
// resolves without touching the DB (safe to run with no live database).
test('runL2Intelligence short-circuits on a past deadline without a DB call', async () => {
  const result = await runL2Intelligence(Date.now() - 1);
  assert.deepEqual(result, { ran: false, skipped: 'deadline' });
});
