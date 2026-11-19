import assert from 'node:assert/strict';
import { formatFailure, newViolations } from '../src/lib/ui-guards/scan.ts';
import { collect, type RuleId } from '../src/lib/ui-guards/rules.ts';

/** Fails with a file:line list when `rule` has offenders beyond test/ux-baseline.json. */
export async function expectNoNewViolations(rule: RuleId, hint: string): Promise<void> {
  const found = await collect(rule);
  assert.equal(newViolations(rule, found).length, 0, formatFailure(rule, hint, found));
}
