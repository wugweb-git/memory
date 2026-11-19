import { describe, it } from 'node:test';
import { expectNoNewViolations } from '../ux-helpers.ts';

describe('UX guard: touch targets in src/components/ui', () => {
  it('default control sizes use min-h-11 (44px) or are documented exceptions', () =>
    expectNoNewViolations('touch-target', 'controls below 44px need min-h-11 (see test/ux-allowlist.json to document an exception)'));
});
