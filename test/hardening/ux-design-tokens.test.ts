import { describe, it } from 'node:test';
import { expectNoNewViolations } from '../ux-helpers.ts';

describe('UX guard: design-token rules (CLAUDE.md) across src/app and src/components', () => {
  it('no hardcoded hex colours (allow-list: test/ux-allowlist.json)', () =>
    expectNoNewViolations('token-hex', 'use CSS-variable tokens from globals.css instead of #hex'));
  it('no text-black / bg-black / zinc-* palette classes', () =>
    expectNoNewViolations('token-black-zinc', 'use text-text-*, bg-bg-*, border-border-* tokens'));
  it('no arbitrary text-[Npx] font sizes', () =>
    expectNoNewViolations('token-arbitrary-font', 'use the named scale text-2xs..text-5xl'));
  it('no italic', () =>
    expectNoNewViolations('token-italic', 'the design system has no italics'));
  it('uppercase only on small eyebrow labels (same element has text-2xs or text-xs)', () =>
    expectNoNewViolations('token-uppercase-eyebrow', 'headings are sentence-case; uppercase is reserved for small eyebrows'));
  it('no inline-style border-radius', () =>
    expectNoNewViolations('token-inline-radius', 'corner radius must come from Tailwind rounded-* tokens'));
});
