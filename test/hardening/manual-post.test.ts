import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routeDistribution } from '../../src/lib/distribution/router.ts';
import { publishToPlatform } from '../../src/lib/publishing/platforms.ts';
import { manualPostText, validatePostUrl, isManualPlatform, MANUAL_PLATFORMS } from '../../src/lib/platforms/manual.ts';
import {
  buildDeliveryRecord,
  describeDelivery,
  deliveryTone,
  extractDelivery,
  applyManualConfirmation,
} from '../../src/lib/publishing/delivery.ts';
import { confirmManualPost } from '../../src/lib/publishing/manual-confirm.ts';

describe('manual platform payloads', () => {
  it('substack is title plus markdown body', () => {
    const r = routeDistribution({ platform: 'substack', content: '# Hello\n\nBody **bold**' });
    assert.equal(r.platform, 'substack');
    assert.deepEqual(r.payload, { title: 'Hello', content: 'Body **bold**' });
    assert.equal(manualPostText('substack', r), 'Hello\n\nBody **bold**');
  });

  it('an explicit title wins and the body is kept whole', () => {
    const r = routeDistribution({ platform: 'substack', content: 'First line\nSecond', title: 'My title' });
    assert.deepEqual(r.payload, { title: 'My title', content: 'First line\nSecond' });
  });

  for (const platform of ['behance', 'dribbble'] as const) {
    it(`${platform} is title, description and tags`, () => {
      const r = routeDistribution({ platform, content: 'Case study\nWhat I built', tags: ['#ui', 'brand'] });
      assert.equal(r.platform, platform);
      assert.deepEqual(r.payload, { title: 'Case study', description: 'What I built', tags: ['ui', 'brand'] });
      assert.equal(manualPostText(platform, r), 'Case study\n\nWhat I built\n\nTags: ui, brand');
    });
  }

  it('still rejects empty content', () => {
    assert.throws(() => routeDistribution({ platform: 'substack', content: '  ' }), /EMPTY_CONTENT/);
  });

  it('knows the manual platforms and their open links', () => {
    assert.ok(isManualPlatform('substack') && isManualPlatform('behance') && isManualPlatform('dribbble'));
    assert.ok(!isManualPlatform('linkedin') && !isManualPlatform('toString'));
    assert.equal(MANUAL_PLATFORMS.dribbble.url, 'https://dribbble.com/shots/new');
  });
});

describe('manual status honesty', () => {
  for (const platform of ['substack', 'behance', 'dribbble']) {
    it(`${platform} returns manual: never delivered, null id`, async () => {
      const built = routeDistribution({ platform, content: 'Some text' });
      const res = await publishToPlatform(platform, built);
      assert.equal(res.status, 'manual');
      assert.equal(res.delivered, false);
      assert.equal(res.externalId, null);
      assert.strictEqual(res.payload, built);
      const rec = buildDeliveryRecord(res);
      assert.equal(rec.status, 'manual');
      assert.equal(rec.delivered, false);
      assert.equal(describeDelivery(rec), 'Waiting for you to post');
    });
  }

  it('a manual status claiming delivered:true is still recorded as not delivered', () => {
    const rec = buildDeliveryRecord({ platform: 'substack', status: 'manual', delivered: true, externalId: null });
    assert.equal(rec.delivered, false);
  });
});

describe('post URL validation', () => {
  it('accepts empty and https links', () => {
    assert.deepEqual(validatePostUrl(''), { ok: true, url: null });
    assert.deepEqual(validatePostUrl(undefined), { ok: true, url: null });
    const ok = validatePostUrl(' https://me.substack.com/p/hello ');
    assert.deepEqual(ok, { ok: true, url: 'https://me.substack.com/p/hello' });
  });
  it('rejects http, junk, other schemes and hosts without a dot', () => {
    for (const bad of ['http://a.com/x', 'not a url', 'javascript:alert(1)', 'https://localhost/x', 'ftp://a.com', 42]) {
      assert.equal(validatePostUrl(bad).ok, false, String(bad));
    }
  });
});

const manualContent = () => ({
  delivery: buildDeliveryRecord({ platform: 'substack', status: 'manual', delivered: false, externalId: null }),
  other: 1,
});

describe('confirm manual post', () => {
  it('records posted_manually, keeps delivered false and stores the url', async () => {
    let saved: Record<string, unknown> | null = null;
    const res = await confirmManualPost(
      { outputId: 'o1', url: 'https://x.substack.com/p/a' },
      {
        findPublished: async () => ({ id: 'row1', publishedContent: manualContent() }),
        updatePublished: async (_id, c) => { saved = c; },
      },
      new Date('2026-01-02T00:00:00Z'),
    );
    assert.equal(res.ok, true);
    const d = extractDelivery(saved);
    assert.equal(d?.status, 'posted_manually');
    assert.equal(d?.delivered, false);
    assert.equal(d?.externalId, null);
    assert.equal(d?.postUrl, 'https://x.substack.com/p/a');
    assert.equal((saved as unknown as { other: number }).other, 1);
    assert.equal(describeDelivery(d), 'Posted by you on Substack');
  });

  it('rejects a bad url before touching the db', async () => {
    let touched = false;
    const res = await confirmManualPost(
      { outputId: 'o1', url: 'http://insecure.com' },
      { findPublished: async () => { touched = true; return null; }, updatePublished: async () => { touched = true; } },
    );
    assert.deepEqual([res.ok, res.ok === false && res.status], [false, 400]);
    assert.equal(touched, false);
  });

  it('requires an outputId, an existing record, and a manual delivery', async () => {
    const none = { findPublished: async () => null, updatePublished: async () => {} };
    const a = await confirmManualPost({ outputId: '' }, none);
    assert.equal(a.ok === false && a.status, 400);
    const b = await confirmManualPost({ outputId: 'o' }, none);
    assert.equal(b.ok === false && b.status, 404);
    const linkedin = {
      findPublished: async () => ({ id: 'r', publishedContent: { delivery: buildDeliveryRecord({ platform: 'linkedin', status: 'published', delivered: true, externalId: 'x' }) } }),
      updatePublished: async () => { throw new Error('must not write'); },
    };
    const c = await confirmManualPost({ outputId: 'o' }, linkedin);
    assert.equal(c.ok === false && c.status, 409);
  });

  it('applyManualConfirmation refuses content with no delivery', () => {
    assert.deepEqual(applyManualConfirmation({}, null), { ok: false, reason: 'no_delivery' });
  });
});

describe('history mapping', () => {
  it('labels and tones the manual statuses', () => {
    const waiting = extractDelivery({ delivery: { platform: 'behance', status: 'manual', delivered: false, at: '' } });
    const posted = extractDelivery({ delivery: { platform: 'dribbble', status: 'posted_manually', delivered: false, postUrl: 'https://dribbble.com/shots/1', at: '' } });
    assert.equal(describeDelivery(waiting), 'Waiting for you to post');
    assert.equal(describeDelivery(posted), 'Posted by you on Dribbble');
    assert.equal(posted?.postUrl, 'https://dribbble.com/shots/1');
    assert.equal(deliveryTone('manual'), 'warning');
    assert.equal(deliveryTone('posted_manually'), 'success');
    assert.equal(deliveryTone('error'), 'danger');
  });

  it('never treats manual states as an error or as delivered', () => {
    for (const status of ['manual', 'posted_manually']) {
      const rec = buildDeliveryRecord({ platform: 'substack', status, delivered: true, externalId: 'fake' });
      assert.equal(rec.status, status);
      assert.equal(rec.error, null);
      assert.equal(rec.delivered, false);
    }
  });
});
