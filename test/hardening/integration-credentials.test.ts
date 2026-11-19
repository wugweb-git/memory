import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  INTEGRATION_ACCOUNTS,
  getCredentialSync,
  isCredentialKey,
  lastFour,
  resetCredentialCache,
  setCredential,
} from '../../src/lib/publishing/credentials';
import { makeSpotifyConnector } from '../../src/lib/connectors/spotify';
import { googleClientConfigured } from '../../src/lib/oauth/google';
import { GET, PUT, DELETE } from '../../src/app/api/integrations/credentials/route';

const KEYS = ['NOTION_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'];

test('every integration env var is a known credential and secrets are flagged', () => {
  for (const k of KEYS) assert.ok(isCredentialKey(k), k);
  const fields = INTEGRATION_ACCOUNTS.flatMap((a) => a.fields);
  for (const f of fields) {
    if (/SECRET|TOKEN/.test(f.key)) assert.equal(f.secret, true, f.key);
  }
  assert.equal(fields.find((f) => f.key === 'GOOGLE_CLIENT_ID')?.secret, false);
});

test('getCredentialSync falls back to env when nothing is stored', () => {
  resetCredentialCache();
  process.env.NOTION_TOKEN = 'ntn_env_value_1234567890';
  assert.equal(getCredentialSync('NOTION_TOKEN'), 'ntn_env_value_1234567890');
  delete process.env.NOTION_TOKEN;
  assert.equal(getCredentialSync('NOTION_TOKEN'), undefined);
});

test('google and spotify configured checks follow env fallback', () => {
  resetCredentialCache();
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  assert.equal(googleClientConfigured(), false);
  process.env.GOOGLE_CLIENT_ID = 'abc.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'secretsecret';
  assert.equal(googleClientConfigured(), true);
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;

  const injected = makeSpotifyConnector({ env: { SPOTIFY_CLIENT_ID: 'a', SPOTIFY_CLIENT_SECRET: 'b', SPOTIFY_REFRESH_TOKEN: 'c' } as any });
  assert.equal(injected.configured(), true);
  const empty = makeSpotifyConnector({ env: {} as any });
  assert.equal(empty.configured(), false);

  process.env.SPOTIFY_CLIENT_ID = 'a'.repeat(32);
  process.env.SPOTIFY_CLIENT_SECRET = 'b'.repeat(32);
  process.env.SPOTIFY_REFRESH_TOKEN = 'c'.repeat(40);
  assert.equal(makeSpotifyConnector().configured(), true);
  delete process.env.SPOTIFY_CLIENT_ID;
  delete process.env.SPOTIFY_CLIENT_SECRET;
  delete process.env.SPOTIFY_REFRESH_TOKEN;
  assert.equal(makeSpotifyConnector().configured(), false);
});

test('validation rejects malformed values before touching the database', async () => {
  const bad: Array<[string, string]> = [
    ['GOOGLE_CLIENT_ID', 'not-a-google-id'],
    ['GOOGLE_CLIENT_SECRET', 'short'],
    ['SPOTIFY_CLIENT_ID', 'xyz'],
    ['SPOTIFY_CLIENT_SECRET', 'g'.repeat(32)],
    ['SPOTIFY_REFRESH_TOKEN', 'tiny'],
    ['NOTION_TOKEN', 'ntn short'],
    ['NOTION_TOKEN', 'ntn_' + 'a'.repeat(30) + '\nsecond-line'],
    ['NOTION_TOKEN', 'x'.repeat(4001)],
  ];
  for (const [k, v] of bad) {
    const r = await setCredential(k, v);
    assert.equal(r.ok, false, `${k} should reject ${v.slice(0, 12)}`);
  }
});

test('lastFour only reveals the tail of long values', () => {
  assert.equal(lastFour('ntn_abcdefghijklmnop'), 'mnop');
  assert.equal(lastFour('short'), null);
  assert.equal(lastFour(null), null);
});

test('credentials route requires an authenticated admin', async () => {
  const url = 'http://localhost/api/integrations/credentials';
  assert.equal((await GET(new NextRequest(url))).status, 401);
  assert.equal((await PUT(new NextRequest(url, { method: 'PUT', body: '{}' }))).status, 401);
  assert.equal((await DELETE(new NextRequest(`${url}?key=NOTION_TOKEN`, { method: 'DELETE' }))).status, 401);
});
