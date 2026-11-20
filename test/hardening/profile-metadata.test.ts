import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileMetadata } from '../../src/app/p/[username]/metadata.ts';
import { pendingManualItems } from '../../src/app/history/manual-pending.ts';

describe('buildProfileMetadata', () => {
  const site = 'https://example.com/';
  it('builds title, description, canonical, og and twitter', () => {
    const m: any = buildProfileMetadata('ved', { displayName: 'Ved S', bio: 'Builds  things', avatarUrl: 'https://img.test/a.png' }, site);
    assert.equal(m.title.absolute, 'Ved S | Identity Prism');
    assert.equal(m.description, 'Builds things');
    assert.equal(m.alternates.canonical, 'https://example.com/p/ved');
    assert.equal(m.openGraph.url, 'https://example.com/p/ved');
    assert.equal(m.openGraph.title, 'Ved S | Identity Prism');
    assert.equal(m.twitter.card, 'summary_large_image');
    assert.deepEqual(m.twitter.images, ['https://img.test/a.png']);
  });
  it('truncates long bios and falls back when there is none', () => {
    const long: any = buildProfileMetadata('a', { displayName: 'A', bio: 'x'.repeat(400) }, site);
    assert.ok(long.description.length <= 160);
    const none: any = buildProfileMetadata('a', { displayName: 'A' }, site);
    assert.match(none.description, /public profile/);
    assert.equal(none.twitter.card, 'summary');
  });
  it('drops non-https avatars and encodes the username', () => {
    const m: any = buildProfileMetadata('a b', { displayName: 'A', avatarUrl: 'javascript:alert(1)' }, site);
    assert.equal(m.openGraph.images, undefined);
    assert.equal(m.alternates.canonical, 'https://example.com/p/a%20b');
  });
  it('returns the static default without a profile', () => {
    assert.deepEqual(buildProfileMetadata('x', null), { title: 'Public profile' });
    assert.deepEqual(buildProfileMetadata('x', { displayName: '  ' }), { title: 'Public profile' });
  });
});

describe('pendingManualItems', () => {
  it('lists only manual rows with text and an output id', () => {
    const rows = [
      { id: '1', outputId: 'o1', platform: 'substack', publishedContent: { title: 'T', content: '# Hello\n\nBody' }, delivery: { status: 'manual', platform: 'substack' } },
      { id: '2', outputId: 'o2', platform: 'substack', publishedContent: { content: 'x' }, delivery: { status: 'posted_manually', platform: 'substack' } },
      { id: '3', outputId: 'o3', platform: 'linkedin', publishedContent: { content: 'x' }, delivery: { status: 'manual', platform: 'linkedin' } },
      { id: '4', platform: 'behance', publishedContent: { content: 'x' }, delivery: { status: 'manual', platform: 'behance' } },
      { id: '5', outputId: 'o5', platform: 'dribbble', publishedContent: { content: 'Shot\nabout it' }, delivery: { status: 'manual', platform: 'dribbble' } },
    ];
    const items = pendingManualItems(rows);
    assert.deepEqual(items.map((i) => i.outputId), ['o1', 'o5']);
    assert.equal(items[0].text, 'Hello\n\nBody');
    assert.equal(items[1].text, 'Shot\n\nabout it');
  });
});
