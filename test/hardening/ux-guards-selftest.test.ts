import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FILE_RULES, routeExists, type Page } from '../../src/lib/ui-guards/rules.ts';
import { newViolations, type BaselineEntry } from '../../src/lib/ui-guards/scan.ts';

/** Proves each detector fires on a seeded violation and stays quiet on the compliant form. */
const run = (rule: string, src: string, file = 'src/components/ui/x.tsx') => FILE_RULES[rule](file, src);

describe('UX guard self-test (detectors are not vacuous)', () => {
  it('token-hex', () => {
    assert.equal(run('token-hex', `const c = '#ff0000';`).length, 1);
    assert.equal(run('token-hex', `<a href="#main">x</a> // #fff`).length, 0);
  });
  it('token-black-zinc', () => {
    assert.equal(run('token-black-zinc', `<div className="bg-black hover:text-zinc-500" />`).length, 2);
    assert.equal(run('token-black-zinc', `<div className="bg-bg-primary text-text-primary" />`).length, 0);
  });
  it('token-arbitrary-font', () => {
    assert.equal(run('token-arbitrary-font', `<p className="text-[13px]" />`).length, 1);
    assert.equal(run('token-arbitrary-font', `<p className="text-sm min-h-[44px]" />`).length, 0);
  });
  it('token-italic', () => {
    assert.equal(run('token-italic', `<p className="italic text-sm" />`).length, 1);
    assert.equal(run('token-italic', `<p className="not-italic" />`).length, 0);
  });
  it('token-uppercase-eyebrow', () => {
    assert.equal(run('token-uppercase-eyebrow', `<h2 className="text-lg uppercase" />`).length, 1);
    assert.equal(run('token-uppercase-eyebrow', `<span className="text-2xs uppercase tracking-wide" />`).length, 0);
  });
  it('token-inline-radius', () => {
    assert.equal(run('token-inline-radius', `<div style={{ borderRadius: 4 }} />`).length, 1);
  });
  it('touch-target (only inside src/components/ui)', () => {
    assert.equal(run('touch-target', `const a = "min-h-9 px-3 py-2";`).length, 1);
    assert.equal(run('touch-target', `const a = "min-h-11 px-3 py-2 sm:min-h-10";`).length, 0);
    assert.equal(run('touch-target', `const a = "min-h-9 px-3";`, 'src/app/x.tsx').length, 0);
  });
  it('a11y-img-alt', () => {
    assert.equal(run('a11y-img-alt', `<img src="/a.png" />`).length, 1);
    assert.equal(run('a11y-img-alt', `<img src="/a.png" alt="" />`).length, 0);
  });
  it('a11y-icon-button-label', () => {
    assert.equal(run('a11y-icon-button-label', `<button onClick={f}><X className="h-4" /></button>`).length, 1);
    assert.equal(run('a11y-icon-button-label', `<button aria-label="Close" onClick={f}><X /></button>`).length, 0);
    assert.equal(run('a11y-icon-button-label', `<button><X /> Close</button>`).length, 0);
  });
  it('a11y-form-label', () => {
    assert.equal(run('a11y-form-label', `<input type="text" placeholder="Name" />`).length, 1);
    assert.equal(run('a11y-form-label', `<input type="text" aria-label="Name" />`).length, 0);
    assert.equal(run('a11y-form-label', `<label htmlFor="n">Name</label><input id="n" />`).length, 0);
    assert.equal(run('a11y-form-label', `<label>Name <input /></label>`).length, 0);
    assert.equal(run('a11y-form-label', `<input type="hidden" />`).length, 0);
  });
  it('a11y-tabindex', () => {
    assert.equal(run('a11y-tabindex', `<div tabIndex={2} />`).length, 1);
    assert.equal(run('a11y-tabindex', `<div tabIndex={0} /><div tabIndex={-1} />`).length, 0);
  });
  it('a11y-outline-none', () => {
    assert.equal(run('a11y-outline-none', `<input className="outline-none" />`).length, 1);
    assert.equal(run('a11y-outline-none', `<input className="focus-visible:outline-none focus-visible:ring-2" />`).length, 0);
    assert.equal(run('a11y-outline-none', `<main tabIndex={-1} className="focus:outline-none" />`).length, 0);
  });
  it('baseline comparison fails only on NEW violations', () => {
    const base: BaselineEntry[] = [{ rule: 'r', file: 'a.tsx', count: 1 }];
    const mk = (file: string, line: number) => ({ rule: 'r', file, line, message: 'm' });
    assert.equal(newViolations('r', [mk('a.tsx', 3)], base).length, 0, 'known offender, even if the line moved');
    assert.equal(newViolations('r', [mk('a.tsx', 3), mk('a.tsx', 9)], base).length, 2, 'a second offender in the file is new');
    assert.equal(newViolations('r', [mk('b.tsx', 1)], base).length, 1, 'a new file is new');
  });
  it('route resolver', () => {
    const pages: Page[] = [{ file: 'f', abs: 'f', route: '/p/[u]', segments: ['p', '[u]'] }];
    assert.ok(routeExists('/p/x', pages));
    assert.ok(!routeExists('/p', pages));
  });
});
