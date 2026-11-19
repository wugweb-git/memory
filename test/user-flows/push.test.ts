import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, createECDH, hkdfSync, randomBytes } from 'node:crypto';
import { b64urlEncode, hashEndpoint, parseEndpointBody, parseSubscription, subscriptionKey } from '../../src/lib/push/keys.ts';
import { encryptPayload, getVapidConfig, sendPush } from '../../src/lib/push/send.ts';

function makeSub() {
  const ua = createECDH('prime256v1');
  ua.generateKeys();
  const auth = randomBytes(16);
  return {
    ua,
    auth,
    sub: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      keys: { p256dh: b64urlEncode(ua.getPublicKey()), auth: b64urlEncode(auth) },
    },
  };
}

describe('push keys', () => {
  it('hashes endpoints stably and namespaces the key', () => {
    const e = 'https://fcm.googleapis.com/fcm/send/abc123';
    assert.equal(hashEndpoint(e), hashEndpoint(e));
    assert.notEqual(hashEndpoint(e), hashEndpoint(e + 'x'));
    assert.match(hashEndpoint(e), /^[0-9a-f]{32}$/);
    assert.equal(subscriptionKey(e), `push-sub:${hashEndpoint(e)}`);
    assert.ok(!subscriptionKey(e).includes('googleapis'));
  });

  it('accepts a valid subscription, bare or wrapped', () => {
    const { sub } = makeSub();
    assert.equal(parseSubscription(sub).ok, true);
    assert.equal(parseSubscription({ subscription: sub }).ok, true);
  });

  it('rejects bad subscriptions', () => {
    const { sub } = makeSub();
    assert.equal(parseSubscription(null).ok, false);
    assert.equal(parseSubscription({}).ok, false);
    assert.equal(parseSubscription({ ...sub, endpoint: 'http://push.example.com/x' }).ok, false);
    assert.equal(parseSubscription({ ...sub, endpoint: 'not a url' }).ok, false);
    assert.equal(parseSubscription({ ...sub, endpoint: 'https://internal.example.com/x' }).ok, false, 'unknown host is refused');
    assert.equal(parseSubscription({ ...sub, endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/abc' }).ok, true);
    assert.equal(parseSubscription({ ...sub, keys: { ...sub.keys, auth: 'AAAA' } }).ok, false);
    assert.equal(parseSubscription({ ...sub, keys: { ...sub.keys, p256dh: 'AAAA' } }).ok, false);
    assert.equal(parseSubscription({ ...sub, keys: undefined }).ok, false);
  });

  it('parses delete bodies', () => {
    assert.equal(parseEndpointBody({ endpoint: 'https://x.test/a' }).ok, true);
    assert.equal(parseEndpointBody({}).ok, false);
  });
});

describe('push sender', () => {
  it('reports NOT_CONFIGURED without VAPID env and never fetches', async () => {
    const { sub } = makeSub();
    let called = false;
    const r = await sendPush(sub, { title: 'Hi' }, { env: {}, fetchImpl: async () => { called = true; return { status: 201 }; } });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.code, 'NOT_CONFIGURED');
    assert.equal(called, false);
    assert.equal(getVapidConfig({ VAPID_PUBLIC_KEY: 'a', VAPID_PRIVATE_KEY: 'b' }), null);
  });

  it('sends a VAPID-signed encrypted request that the device can decrypt', async () => {
    const { sub, ua, auth } = makeSub();
    const vapid = createECDH('prime256v1');
    vapid.generateKeys();
    const env = {
      VAPID_PUBLIC_KEY: b64urlEncode(vapid.getPublicKey()),
      VAPID_PRIVATE_KEY: b64urlEncode(vapid.getPrivateKey()),
      VAPID_SUBJECT: 'mailto:owner@example.com',
    };
    let seen: { url: string; headers: Record<string, string>; body: Buffer } | null = null;
    const r = await sendPush(sub, { title: 'Hello', body: 'World', url: '/ask' }, {
      env,
      fetchImpl: async (url, init) => { seen = { url, headers: init.headers, body: init.body }; return { status: 201 }; },
    });
    assert.equal(r.ok, true);
    assert.ok(seen);
    const s = seen as unknown as { url: string; headers: Record<string, string>; body: Buffer };
    assert.equal(s.url, sub.endpoint);
    assert.match(s.headers.Authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
    assert.equal(s.headers['Content-Encoding'], 'aes128gcm');

    // Decrypt as the user agent would (RFC 8291).
    const salt = s.body.subarray(0, 16);
    const idlen = s.body[20];
    const asPublic = s.body.subarray(21, 21 + idlen);
    const cipher = s.body.subarray(21 + idlen);
    const shared = ua.computeSecret(asPublic);
    const prk = Buffer.from(hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPublic]), 32));
    const cek = Buffer.from(hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
    const nonce = Buffer.from(hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
    const d = createDecipheriv('aes-128-gcm', cek, nonce);
    d.setAuthTag(cipher.subarray(cipher.length - 16));
    const plain = Buffer.concat([d.update(cipher.subarray(0, cipher.length - 16)), d.final()]);
    assert.equal(plain[plain.length - 1], 2);
    assert.deepEqual(JSON.parse(plain.subarray(0, -1).toString()), { title: 'Hello', body: 'World', url: '/ask' });
  });

  it('maps 410 to GONE', async () => {
    const { sub } = makeSub();
    const vapid = createECDH('prime256v1');
    vapid.generateKeys();
    const env = { VAPID_PUBLIC_KEY: b64urlEncode(vapid.getPublicKey()), VAPID_PRIVATE_KEY: b64urlEncode(vapid.getPrivateKey()), VAPID_SUBJECT: 'mailto:a@b.co' };
    const r = await sendPush(sub, { title: 'x' }, { env, fetchImpl: async () => ({ status: 410 }) });
    assert.equal(!r.ok && r.code, 'GONE');
    assert.ok(encryptPayload(sub, Buffer.from('x')).length > 86);
  });
});
