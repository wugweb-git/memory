import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPostMetrics } from '../../src/jobs/engagement-fetcher';
import { aggregateContentAnalytics } from '../../src/lib/analytics/content';

const realFetch = globalThis.fetch;
const reset = () => {
  globalThis.fetch = realFetch;
  delete process.env.LINKEDIN_ACCESS_TOKEN;
};

test('medium is unsupported, never zeros', async () => {
  const r = await fetchPostMetrics('medium', 'abc');
  assert.equal(r.status, 'unsupported');
});

test('linkedin without token is unavailable', async () => {
  delete process.env.LINKEDIN_ACCESS_TOKEN;
  const r = await fetchPostMetrics('linkedin', 'urn:li:share:1');
  assert.equal(r.status, 'unavailable');
});

test('linkedin socialMetadata counts are summed', async () => {
  process.env.LINKEDIN_ACCESS_TOKEN = 't';
  let url = '';
  globalThis.fetch = (async (u: string) => {
    url = String(u);
    return new Response(JSON.stringify({ reactionSummaries: { LIKE: { count: 3 }, PRAISE: { count: 2 } }, commentSummary: { count: 4 } }), { status: 200 });
  }) as unknown as typeof fetch;
  try {
    const r = await fetchPostMetrics('linkedin', 'urn:li:share:1');
    assert.deepEqual(r, { status: 'ok', metrics: { likes: 5, comments: 4 } });
    assert.match(url, /rest\/socialMetadata\/urn%3Ali%3Ashare%3A1$/);
  } finally { reset(); }
});

test('linkedin 403 is unavailable with the reason', async () => {
  process.env.LINKEDIN_ACCESS_TOKEN = 't';
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: 'nope' }), { status: 403 })) as typeof fetch;
  try {
    const r = await fetchPostMetrics('linkedin', 'x');
    assert.equal(r.status, 'unavailable');
    assert.match((r as any).reason, /403/);
  } finally { reset(); }
});

test('analytics distinguishes no data from zero engagement', () => {
  const now = new Date();
  const published = [
    { platform: 'linkedin', externalId: 'a' },
    { platform: 'linkedin', externalId: 'b' },
    { platform: 'medium', externalId: 'c' },
  ];
  const snapshots = [
    { platform: 'linkedin', externalPostId: 'a', createdAt: now, payload: { status: 'ok', metrics: { likes: 0, comments: 0 } } },
    { platform: 'linkedin', externalPostId: 'b', createdAt: now, payload: { status: 'unavailable', reason: 'HTTP 403' } },
    { platform: 'medium', externalPostId: 'c', createdAt: now, payload: { status: 'unsupported', reason: 'Medium has no metrics API.' } },
  ];
  const r = aggregateContentAnalytics(published, snapshots).engagement;
  assert.equal(r.postsWithData, 1);
  assert.equal(r.postsWithZeroEngagement, 1);
  assert.equal(r.postsNoData, 2);
  assert.equal(r.hasData, true);
  assert.equal(r.unavailableReasons.medium, 'Medium has no metrics API.');
  const none = aggregateContentAnalytics(published, []).engagement;
  assert.equal(none.hasData, false);
  assert.equal(none.postsNoData, 3);
});
