import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanDeviceName,
  resolveRelyingParty,
  signChallenge,
  verifyChallenge,
  challengeCookie,
} from '../../src/lib/security/passkey.ts';
import { rememberedSessionCookie, sessionCookie } from '../../src/lib/security/auth.ts';

const SECRET = 'test-secret';

describe('passkey host allow-list', () => {
  it('accepts allow-listed hosts and derives rpID and origin', () => {
    assert.deepEqual(resolveRelyingParty('www.vedanshusrivastava.com'), {
      rpID: 'www.vedanshusrivastava.com',
      origin: 'https://www.vedanshusrivastava.com',
    });
    assert.equal(resolveRelyingParty('memory-wugweb.vercel.app')?.rpID, 'memory-wugweb.vercel.app');
    assert.deepEqual(resolveRelyingParty('localhost:3000'), { rpID: 'localhost', origin: 'http://localhost:3000' });
  });
  it('rejects unknown, spoofed or malformed hosts', () => {
    for (const h of ['evil.com', 'vedanshusrivastava.com.evil.com', 'a.vedanshusrivastava.com', 'vedanshusrivastava.com:8443', '', null, 'x/y']) {
      assert.equal(resolveRelyingParty(h as string | null), null, String(h));
    }
  });
});

describe('passkey challenge cookie', () => {
  it('round-trips a valid challenge', () => {
    const v = signChallenge('login', 'abc_DEF-123', SECRET, 1_000_000);
    assert.equal(verifyChallenge(v, 'login', SECRET, 1_000_000), 'abc_DEF-123');
  });
  it('rejects wrong purpose, wrong secret, tampering and expiry', () => {
    const v = signChallenge('register', 'chal', SECRET, 1_000_000);
    assert.equal(verifyChallenge(v, 'login', SECRET, 1_000_000), null);
    assert.equal(verifyChallenge(v, 'register', 'other', 1_000_000), null);
    assert.equal(verifyChallenge(v.replace('chal', 'chaX'), 'register', SECRET, 1_000_000), null);
    assert.equal(verifyChallenge(v, 'register', SECRET, 1_000_000 + 301_000), null);
    assert.equal(verifyChallenge(undefined, 'register', SECRET), null);
    assert.equal(verifyChallenge('a.b', 'register', SECRET), null);
  });
  it('cookie is httpOnly, strict and scoped', () => {
    const c = challengeCookie('x');
    assert.match(c, /HttpOnly/);
    assert.match(c, /SameSite=Strict/);
    assert.match(c, /Path=\/api\/auth\/passkey/);
  });
});

describe('remember cookie options', () => {
  it('persists 90 days by default and when true', () => {
    assert.match(rememberedSessionCookie('t', undefined), /Max-Age=7776000/);
    assert.match(rememberedSessionCookie('t', true), /Max-Age=7776000/);
  });
  it('is a session cookie when explicitly false', () => {
    const c = rememberedSessionCookie('t', false);
    assert.doesNotMatch(c, /Max-Age/);
    assert.match(c, /HttpOnly/);
    assert.doesNotMatch(sessionCookie('t', null), /Max-Age/);
  });
});

describe('device name', () => {
  it('trims, bounds and defaults', () => {
    assert.equal(cleanDeviceName('  Phone  '), 'Phone');
    assert.equal(cleanDeviceName(''), 'This device');
    assert.equal(cleanDeviceName(123), 'This device');
    assert.equal(cleanDeviceName('x'.repeat(100)).length, 60);
  });
});
