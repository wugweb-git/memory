import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  customFeedId,
  normalizeConfigValue,
  normalizeFeedUrl,
  normalizeGithubUser,
  normalizeYoutubeChannel,
} from '../../src/lib/ingestion/connectors/config';

test('github: accepts a username, @handle or profile URL', () => {
  assert.deepEqual(normalizeGithubUser('octocat'), { ok: true, value: 'octocat' });
  assert.deepEqual(normalizeGithubUser('@octocat'), { ok: true, value: 'octocat' });
  assert.deepEqual(normalizeGithubUser('https://github.com/octocat?tab=repos'), { ok: true, value: 'octocat' });
});

test('github: rejects values that cannot be a username', () => {
  for (const bad of ['', 'a b', '-lead', 'trail-', 'x'.repeat(40), 'a/b', 'octo cat']) {
    assert.equal(normalizeGithubUser(bad).ok, false, bad);
  }
});

test('youtube: takes a /channel/UC URL or a bare UC id, rejects @handles', () => {
  const id = 'UC' + 'a'.repeat(22);
  assert.deepEqual(normalizeYoutubeChannel(id), { ok: true, value: id });
  assert.deepEqual(normalizeYoutubeChannel(`https://www.youtube.com/channel/${id}`), { ok: true, value: id });
  assert.equal(normalizeYoutubeChannel('https://www.youtube.com/@someone').ok, false);
  assert.equal(normalizeYoutubeChannel('UCshort').ok, false);
});

test('feed url: adds https, rejects other schemes, credentials and bare words', () => {
  const ok = normalizeFeedUrl('example.com/feed');
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value, 'https://example.com/feed');
  assert.equal(normalizeFeedUrl('ftp://example.com/feed').ok, false);
  assert.equal(normalizeFeedUrl('https://user:pw@example.com/feed').ok, false);
  assert.equal(normalizeFeedUrl('localhost').ok, false);
  assert.equal(normalizeFeedUrl('not a url').ok, false);
});

test('normalizeConfigValue refuses sources that are not configurable', () => {
  assert.equal(normalizeConfigValue('notion', 'x').ok, false);
});

test('customFeedId is stable and differs per url', () => {
  assert.equal(customFeedId('https://a.com/feed'), customFeedId('https://a.com/feed'));
  assert.notEqual(customFeedId('https://a.com/feed'), customFeedId('https://b.com/feed'));
  assert.match(customFeedId('https://a.com/feed'), /^feed-[a-z0-9]+$/);
});
