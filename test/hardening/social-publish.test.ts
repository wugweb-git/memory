import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { routeDistribution } from '../../src/lib/distribution/router';
import { publishToPlatform } from '../../src/lib/publishing/platforms';
import { splitIntoThread } from '../../src/lib/platforms/x';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of ['X_ACCESS_TOKEN', 'FACEBOOK_PAGE_TOKEN', 'FACEBOOK_PAGE_ID', 'INSTAGRAM_USER_ID']) delete process.env[k];
});

test('splitIntoThread keeps every post within 280 chars and loses no words', () => {
  const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} says something.`).join(' ');
  const posts = splitIntoThread(text);
  assert.ok(posts.length > 1);
  assert.ok(posts.every((p) => p.length <= 280));
  assert.equal(posts.join(' ').replace(/\s+/g, ' '), text);
});

test('x, facebook and instagram report not_configured without credentials and send nothing', async () => {
  let called = false;
  globalThis.fetch = (async () => { called = true; return new Response('{}'); }) as typeof fetch;
  for (const platform of ['x', 'facebook', 'instagram']) {
    const built = routeDistribution({ platform, content: 'hello' });
    const res = await publishToPlatform(platform, built);
    assert.equal(res.status, 'not_configured');
    assert.equal(res.externalId, null);
    assert.equal(res.delivered, false);
  }
  assert.equal(called, false);
});

test('x publishes a thread as chained replies and returns the first id', async () => {
  process.env.X_ACCESS_TOKEN = 't';
  const bodies: any[] = [];
  let n = 0;
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ data: { id: `id${++n}` } }), { status: 201 });
  }) as typeof fetch;
  const long = Array.from({ length: 30 }, (_, i) => `Point ${i} is worth making clearly.`).join(' ');
  const res = await publishToPlatform('x', routeDistribution({ platform: 'x', content: long }));
  assert.equal(res.status, 'published');
  assert.equal(res.externalId, 'id1');
  assert.equal(bodies[0].reply, undefined);
  assert.equal(bodies[1].reply.in_reply_to_tweet_id, 'id1');
  assert.ok(bodies.length >= 2);
});

test('x reports an error, not published, when the API returns no id', async () => {
  process.env.X_ACCESS_TOKEN = 't';
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: {} }), { status: 201 })) as typeof fetch;
  const res = await publishToPlatform('x', routeDistribution({ platform: 'x', content: 'hi' }));
  assert.equal(res.status, 'error');
  assert.equal(res.externalId, null);
});

test('facebook posts to the page feed and needs a page id', async () => {
  process.env.FACEBOOK_PAGE_TOKEN = 't';
  const missing = await publishToPlatform('facebook', routeDistribution({ platform: 'facebook', content: 'hi' }));
  assert.equal(missing.status, 'error');
  assert.match(missing.error ?? '', /FACEBOOK_PAGE_ID_MISSING/);
  process.env.FACEBOOK_PAGE_ID = '123';
  let url = '';
  globalThis.fetch = (async (u: string) => { url = u; return new Response(JSON.stringify({ id: '123_456' }), { status: 200 }); }) as typeof fetch;
  const res = await publishToPlatform('facebook', routeDistribution({ platform: 'facebook', content: 'hi' }));
  assert.equal(res.status, 'published');
  assert.equal(res.externalId, '123_456');
  assert.match(url, /\/123\/feed$/);
});

test('instagram refuses text-only posts and publishes via container then publish', async () => {
  process.env.FACEBOOK_PAGE_TOKEN = 't';
  process.env.INSTAGRAM_USER_ID = 'ig1';
  const noImage = await publishToPlatform('instagram', routeDistribution({ platform: 'instagram', content: 'hi' }));
  assert.equal(noImage.status, 'error');
  assert.match(noImage.error ?? '', /INSTAGRAM_IMAGE_REQUIRED/);
  const urls: string[] = [];
  globalThis.fetch = (async (u: string) => {
    urls.push(u);
    return new Response(JSON.stringify({ id: u.endsWith('/media') ? 'c1' : 'p1' }), { status: 200 });
  }) as typeof fetch;
  const res = await publishToPlatform('instagram', routeDistribution({ platform: 'instagram', content: 'hi', imageUrl: 'https://example.com/a.jpg' }));
  assert.equal(res.status, 'published');
  assert.equal(res.externalId, 'p1');
  assert.equal(urls.length, 2);
});
