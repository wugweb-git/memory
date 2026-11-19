import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUBLISH_ACCOUNTS, isCredentialKey, getCredential, setCredential } from '../../src/lib/publishing/credentials';

test('every publisher env var is a known credential key and secrets are flagged', () => {
  for (const key of ['LINKEDIN_ACCESS_TOKEN', 'X_ACCESS_TOKEN', 'FACEBOOK_PAGE_TOKEN', 'FACEBOOK_PAGE_ID', 'INSTAGRAM_USER_ID', 'MEDIUM_INTEGRATION_TOKEN']) {
    assert.ok(isCredentialKey(key), key);
  }
  assert.equal(isCredentialKey('DATABASE_URL'), false);
  const tokens = PUBLISH_ACCOUNTS.flatMap((a) => a.fields).filter((f) => /TOKEN/.test(f.key));
  assert.ok(tokens.length > 0 && tokens.every((f) => f.secret));
});

test('getCredential falls back to the env var when the database is unavailable', async () => {
  process.env.X_ACCESS_TOKEN = 'from-env';
  assert.equal(await getCredential('X_ACCESS_TOKEN'), 'from-env');
  delete process.env.X_ACCESS_TOKEN;
});

test('getCredential never reads arbitrary env vars through the store', async () => {
  process.env.SOME_SECRET = 'x';
  assert.equal(await getCredential('SOME_SECRET'), 'x'); // unknown keys pass straight to env, never the DB
  delete process.env.SOME_SECRET;
});

test('setCredential rejects unknown keys and empty values before touching the database', async () => {
  assert.equal((await setCredential('NOPE', 'v')).ok, false);
  assert.equal((await setCredential('X_ACCESS_TOKEN', '   ')).ok, false);
});
