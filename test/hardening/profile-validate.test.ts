import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProfileInput,
  validateSectionInput,
  pickProfileFields,
  toPublicProfile,
  isSectionPublic,
  isValidUsername,
  LIMITS,
} from '../../src/lib/profile/validate.ts';
import { showcaseFilter } from '../../src/lib/cms/showcase-filters.ts';

describe('profile write whitelist', () => {
  it('strips unknown and protected fields', () => {
    const r = validateProfileInput({
      displayName: 'Owner',
      bio: 'hi',
      id: 'x',
      username: 'evil',
      test_run_id: 'PROD',
      created_at: '2020-01-01',
      role: 'admin',
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, { displayName: 'Owner', bio: 'hi' });
  });

  it('rejects wrong types and oversize values', () => {
    assert.equal(validateProfileInput({ displayName: 42 }).ok, false);
    assert.equal(validateProfileInput({ displayName: '' }).ok, false);
    assert.equal(validateProfileInput({ displayName: 'x'.repeat(LIMITS.displayName + 1) }).ok, false);
    assert.equal(validateProfileInput({ bio: 'x'.repeat(LIMITS.bio + 1) }).ok, false);
    assert.equal(validateProfileInput({ isPublished: 'yes' }).ok, false);
    assert.equal(validateProfileInput({ avatarUrl: 'javascript:alert(1)' }).ok, false);
    assert.equal(validateProfileInput({ socialLinks: [{ platform: 'x', url: 'ftp://a' }] }).ok, false);
    assert.equal(validateProfileInput('nope').ok, false);
    assert.equal(validateProfileInput([]).ok, false);
  });

  it('accepts valid social links, theme and https urls', () => {
    const r = validateProfileInput({
      avatarUrl: 'https://example.com/a.png',
      coverImageUrl: '/cover.png',
      socialLinks: [{ platform: 'github', url: 'https://github.com/x', extra: 1 }],
      theme: { mode: 'light' },
      isPublished: true,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.socialLinks, [{ platform: 'github', url: 'https://github.com/x' }]);
  });

  it('validates sections: required fields, types, strips extras', () => {
    assert.equal(validateSectionInput({ title: 'T' }).ok, false);
    assert.equal(validateSectionInput({ type: 'blog' }).ok, false);
    assert.equal(validateSectionInput({ type: 'bad type!', title: 'T' }).ok, false);
    assert.equal(validateSectionInput({ type: 'blog', title: 'T', content: 'str' }).ok, false);
    const big = { type: 'blog', title: 'T', content: { body: 'x'.repeat(LIMITS.contentBytes) } };
    assert.equal(validateSectionInput(big).ok, false);
    const ok = validateSectionInput({ type: 'blog', title: 'T', content: { a: 1 }, id: 'zzz', isAdmin: true });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.deepEqual(Object.keys(ok.value).sort(), ['content', 'title', 'type']);
    assert.equal(validateSectionInput({ title: 'New' }, { partial: true }).ok, true);
  });

  it('store-level pick keeps only writable keys', () => {
    const picked = pickProfileFields({ displayName: 'a', id: 'x', username: 'u', test_run_id: 'P' } as Record<string, unknown>);
    assert.deepEqual(picked, { displayName: 'a' });
  });

  it('validates usernames', () => {
    assert.equal(isValidUsername('system_user'), true);
    assert.equal(isValidUsername('a/b'), false);
    assert.equal(isValidUsername(''), false);
  });
});

describe('unpublished filter', () => {
  const sections = [
    { id: '1', type: 'blog', title: 'Live', content: {} },
    { id: '2', type: 'blog', title: 'Draft flag', content: {}, settings: { draft: true } },
    { id: '3', type: 'blog', title: 'Status', content: { status: 'Draft' } },
    { id: '4', type: 'blog', title: 'Pub false', content: {}, settings: { published: false } },
  ];

  it('hides draft sections from the public view', () => {
    const pub = toPublicProfile({ username: 'u', displayName: 'U', isPublished: true, sections });
    assert.ok(pub);
    assert.deepEqual(pub!.sections.map((s) => s.id), ['1']);
  });

  it('unpublished profile is not public (null => 404) and internals are stripped', () => {
    assert.equal(toPublicProfile({ username: 'u', displayName: 'U', isPublished: false, sections }), null);
    const pub = toPublicProfile({
      username: 'u', displayName: 'U', isPublished: true, sections: [],
      ...({ test_run_id: 'PROD', id: 'abc' } as object),
    });
    assert.equal('test_run_id' in pub!, false);
    assert.equal('id' in pub!, false);
  });

  it('isSectionPublic defaults to visible', () => {
    assert.equal(isSectionPublic({ content: {}, settings: undefined }), true);
  });

  it('showcase GROQ: public excludes drafts and future items; owner sees all', () => {
    const pub = showcaseFilter('blogPost', false);
    assert.match(pub, /drafts\.\*\*/);
    assert.match(pub, /publishedAt <= now\(\)/);
    const owner = showcaseFilter('blogPost', true);
    assert.equal(owner, '_type == "blogPost"');
  });
});
