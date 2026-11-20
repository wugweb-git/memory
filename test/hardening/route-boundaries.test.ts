import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('route boundaries: not-found, error, global-error, loading', () => {
  it('not-found exports a default, one h1, title, console and public profile links', () => {
    const s = src('src/app/not-found.tsx');
    assert.match(s, /export default function/);
    assert.equal((s.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.match(s, /title: 'Page not found'/);
    assert.match(s, /href="\/console"/);
    assert.match(s, /\/p\/\$\{IDENTITY_CONFIG\.HANDLE\}/);
  });

  for (const f of ['src/app/error.tsx', 'src/app/global-error.tsx', 'src/app/_components/ErrorPanel.tsx']) {
    it(`${f} never renders raw error text or stack`, () => {
      const s = src(f);
      assert.doesNotMatch(s, /error\.message|error\.stack|\.stack\b|String\(error\)/);
    });
  }

  it('error boundaries offer Try again, console link, alert role, heading focus, digest reference', () => {
    for (const f of ['src/app/_components/ErrorPanel.tsx', 'src/app/global-error.tsx']) {
      const s = src(f);
      assert.match(s, /Try again/);
      assert.match(s, /href="\/console"/);
      assert.match(s, /role="alert"/);
      assert.match(s, /\.focus\(\)/);
      assert.match(s, /digest/);
      assert.equal((s.match(/<h1[\s>]/g) ?? []).length, 1);
    }
    assert.match(src('src/app/error.tsx'), /^'use client'/);
    assert.match(src('src/app/global-error.tsx'), /^'use client'/);
  });

  it('global-error renders its own html and body without hardcoded hex', () => {
    const s = src('src/app/global-error.tsx');
    assert.match(s, /<html/);
    assert.match(s, /<body/);
    assert.doesNotMatch(s, /#[0-9a-fA-F]{3,8}\b/);
  });

  for (const r of ['console', 'memory', 'buffer', 'content', 'integrations', 'system', 'admin']) {
    it(`${r}/loading.tsx exists and renders the status skeleton`, () => {
      const p = `src/app/${r}/loading.tsx`;
      assert.ok(existsSync(join(ROOT, p)));
      assert.match(src(p), /export default function Loading/);
      assert.match(src(p), /RouteLoading/);
    });
  }

  it('RouteLoading has role=status, sr-only Loading, and uses the motion-safe Skeleton', () => {
    const s = src('src/components/ui/route-loading.tsx');
    assert.match(s, /role="status"/);
    assert.match(s, /sr-only">Loading</);
    assert.match(s, /Skeleton/);
    assert.match(src('src/components/ui/primitives.tsx'), /motion-safe:animate-pulse/);
  });
});
