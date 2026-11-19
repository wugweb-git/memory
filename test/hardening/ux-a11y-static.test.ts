import { describe, it } from 'node:test';
import { expectNoNewViolations } from '../ux-helpers.ts';

describe('UX guard: static accessibility rules (src/app, src/components)', () => {
  it('every <img>/<Image> has alt', () =>
    expectNoNewViolations('a11y-img-alt', 'add alt text (alt="" if decorative) - WCAG 1.1.1'));
  it('every icon-only <button> has aria-label', () =>
    expectNoNewViolations('a11y-icon-button-label', 'a button whose only child is an icon needs aria-label - WCAG 4.1.2'));
  it('every <input>/<select>/<textarea> has a label (aria-label, <label htmlFor> or wrapping <label>)', () =>
    expectNoNewViolations('a11y-form-label', 'placeholders are not labels - WCAG 1.3.1 / 3.3.2'));
  it('no tabIndex greater than 0', () =>
    expectNoNewViolations('a11y-tabindex', 'positive tabindex breaks focus order - WCAG 2.4.3'));
  it('outline-none always has a focus-visible replacement on the same element', () =>
    expectNoNewViolations('a11y-outline-none', 'keep a visible focus indicator - WCAG 2.4.7 (tabIndex=-1 targets are exempt)'));
});
