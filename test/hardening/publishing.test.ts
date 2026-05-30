import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { profilePath } from '../../src/lib/api/endpoints.ts';
import { sectionsByType } from '../../src/lib/profile/store.ts';
import type { ProfileSection } from '../../src/lib/profile/types.ts';

describe('publishing hardening', () => {
  it('exposes profile publish routes', () => {
    assert.equal(profilePath('demo'), '/api/profile/demo');
    assert.equal(profilePath('demo', 'publish'), '/api/profile/demo/publish');
  });

  it('filters profile sections by type', () => {
    const sections: ProfileSection[] = [
      { id: '1', type: 'blog', title: 'A', content: {} },
      { id: '2', type: 'published', title: 'B', content: {} },
      { id: '3', type: 'blog', title: 'C', content: {} },
    ];
    assert.equal(sectionsByType(sections, 'blog').length, 2);
    assert.equal(sectionsByType(sections, 'PUBLISHED').length, 1);
  });
});
