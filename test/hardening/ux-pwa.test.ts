import { describe, it } from 'node:test';
import { expectNoNewViolations } from '../ux-helpers.ts';

describe('UX guard: PWA', () => {
  it('manifest start_url, scope, shortcuts, icons and screenshots resolve (routes and files on disk)', () =>
    expectNoNewViolations('pwa-manifest', 'public/manifest.json references something that does not exist'));
  it('service worker declares a VERSION constant', () =>
    expectNoNewViolations('pwa-sw-version', 'public/sw.js needs `const VERSION = ...` so releases bust the cache'));
  it('viewport does not disable or cap zoom', () =>
    expectNoNewViolations('pwa-viewport-zoom', 'remove maximum-scale / user-scalable=no from the viewport export (WCAG 1.4.4)'));
});
