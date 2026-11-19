import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expectNoNewViolations } from '../ux-helpers.ts';
import { listPages, TITLE_EXCEPTIONS, H1_EXCEPTIONS } from '../../src/lib/ui-guards/rules.ts';

describe('UX guard: page semantics (static scan of src/app/**/page.tsx)', () => {
  it('sanity: pages are discovered and exceptions point at real files', () => {
    const files = new Set(listPages().map((p) => p.file));
    assert.ok(files.size >= 20);
    for (const f of [...Object.keys(TITLE_EXCEPTIONS), ...Object.keys(H1_EXCEPTIONS)]) assert.ok(files.has(f), `stale exception ${f}`);
  });
  it('every page sets a document title (own metadata or the nearest layout, not just the root default)', () =>
    expectNoNewViolations('page-title', 'export `metadata` (or generateMetadata) from the page or a layout; exceptions live in TITLE_EXCEPTIONS'));
  it('document titles are unique across pages', () =>
    expectNoNewViolations('page-title-unique', 'two routes resolve to the same static <title> (WCAG 2.4.2)'));
  it('every page renders exactly one <h1> (sr-only allowed)', () =>
    expectNoNewViolations('page-h1', 'a page must render exactly one h1 across the components it mounts; exceptions live in H1_EXCEPTIONS'));
});
