import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeDistribution } from '../../src/lib/distribution/router';
import { publishToPlatform } from '../../src/lib/publishing/platforms';
import { publishNow } from '../../src/lib/publishing/publisher';

// These tests guard the L5 publish honesty fix. They must run with NO external
// credentials configured (the free-tier default), so clear them defensively.
delete process.env.LINKEDIN_ACCESS_TOKEN;
delete process.env.MEDIUM_INTEGRATION_TOKEN;

test('the payload built by routeDistribution is what reaches publishToPlatform (not raw content)', async () => {
  const rawContent = 'hello world narrative';
  const built = routeDistribution({ platform: 'linkedin', content: rawContent, tags: ['ai'] });

  const res = await publishToPlatform('linkedin', built);

  // The exact object built upstream is echoed back — the platform never
  // received the raw content string.
  assert.strictEqual(res.payload, built);
  assert.notStrictEqual(res.payload, rawContent);
  // Sanity: the built payload is the formatted LinkedIn shape, not the raw text.
  assert.equal((built as { platform: string }).platform, 'linkedin');
});

test('publishNow threads the built payload through to the platform (raw content is only a fallback)', async () => {
  const built = routeDistribution({ platform: 'medium', content: 'raw-content', title: 'T', tags: ['x'] });

  const res = await publishNow({ platform: 'medium', content: 'raw-content', payload: built });

  assert.strictEqual(res.payload, built);
  assert.notStrictEqual(res.payload, 'raw-content');
});

test('an unconfigured external platform yields an honest status, not a fabricated published/fake id', async () => {
  const built = routeDistribution({ platform: 'linkedin', content: 'x' });
  const res = await publishToPlatform('linkedin', built);

  assert.equal(res.status, 'not_configured');
  assert.equal(res.externalId, null);
  assert.equal(res.delivered, false);
  // The old bug fabricated { status: 'published', externalId: `linkedin_<ts>` }.
  assert.notEqual(res.status, 'published');
});

test('medium with no token is also not_configured', async () => {
  const built = routeDistribution({ platform: 'medium', content: 'x' });
  const res = await publishToPlatform('medium', built);
  assert.equal(res.status, 'not_configured');
  assert.equal(res.externalId, null);
  assert.equal(res.delivered, false);
});

test('internal profile/CMS platforms report internal, never a fabricated external send', async () => {
  for (const platform of ['portfolio', 'cms']) {
    const built = routeDistribution({ platform, content: 'x' });
    const res = await publishToPlatform(platform, built);
    assert.equal(res.status, 'internal');
    assert.equal(res.externalId, null);
    assert.equal(res.delivered, false);
    assert.strictEqual(res.payload, built);
  }
});

test('a configured platform whose API call fails reports an honest error, never a fake id', async () => {
  process.env.LINKEDIN_ACCESS_TOKEN = 'test-token';
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: 'denied' }), { status: 401 })) as typeof fetch;
  try {
    const built = routeDistribution({ platform: 'linkedin', content: 'x' });
    const res = await publishToPlatform('linkedin', built);
    assert.equal(res.status, 'error');
    assert.equal(res.externalId, null);
    assert.equal(res.delivered, false);
    assert.match(String(res.error), /HTTP_401/);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.LINKEDIN_ACCESS_TOKEN;
  }
});

test('a configured platform that accepts the post reports the real external id', async () => {
  process.env.LINKEDIN_ACCESS_TOKEN = 'test-token';
  process.env.LINKEDIN_AUTHOR_URN = 'urn:li:person:abc';
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('{}', { status: 201, headers: { 'x-restli-id': 'urn:li:share:123' } })) as typeof fetch;
  try {
    const built = routeDistribution({ platform: 'linkedin', content: 'hello world' });
    const res = await publishToPlatform('linkedin', built);
    assert.equal(res.status, 'published');
    assert.equal(res.externalId, 'urn:li:share:123');
    assert.equal(res.delivered, true);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.LINKEDIN_ACCESS_TOKEN;
    delete process.env.LINKEDIN_AUTHOR_URN;
  }
});

test('routeDistribution validation behavior is intact', () => {
  assert.throws(() => routeDistribution({ platform: 'linkedin', content: '   ' }), /EMPTY_CONTENT/);
  assert.throws(
    () => routeDistribution({ platform: 'linkedin', content: 'x', scheduledAt: 'not-a-date' }),
    /INVALID_SCHEDULE/,
  );
  assert.throws(() => routeDistribution({ platform: 'myspace', content: 'x' }), /UNSUPPORTED_PLATFORM/);
});
