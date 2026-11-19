import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  hkdfSync,
  randomBytes,
  sign,
} from 'node:crypto';
import { b64urlDecode, b64urlEncode, type PushSubscriptionJSON } from './keys';

/**
 * Web Push sender. VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291)
 * implemented with node:crypto; the `web-push` package is not a dependency.
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (both base64url, raw P-256), VAPID_SUBJECT (mailto: or https:).
 */

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

export type SendResult =
  | { ok: true; status: number }
  | { ok: false; code: 'NOT_CONFIGURED' | 'GONE' | 'FAILED'; status?: number; message: string };

export function getVapidConfig(env: Record<string, string | undefined> = process.env): VapidConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export const NOT_CONFIGURED_MESSAGE = 'Push notifications are not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.';

function vapidJwt(cfg: VapidConfig, audience: string, nowSec: number): string {
  const header = b64urlEncode(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64urlEncode(
    Buffer.from(JSON.stringify({ aud: audience, exp: nowSec + 12 * 3600, sub: cfg.subject })),
  );
  const pub = b64urlDecode(cfg.publicKey);
  const key = createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: cfg.privateKey,
      x: b64urlEncode(pub.subarray(1, 33)),
      y: b64urlEncode(pub.subarray(33, 65)),
    },
    format: 'jwk',
  });
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${claims}.${b64urlEncode(signature)}`;
}

/** RFC 8291 aes128gcm body for one record. `ephemeral` is injectable for tests. */
export function encryptPayload(
  sub: PushSubscriptionJSON,
  plaintext: Buffer,
  ephemeral?: { ecdh: ReturnType<typeof createECDH>; salt: Buffer },
): Buffer {
  const uaPublic = b64urlDecode(sub.keys.p256dh);
  const authSecret = b64urlDecode(sub.keys.auth);
  const ecdh = ephemeral?.ecdh ?? createECDH('prime256v1');
  if (!ephemeral) ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const salt = ephemeral?.salt ?? randomBytes(16);

  const prk = Buffer.from(
    hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32),
  );
  const cek = Buffer.from(hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: nonce\0'), 12));

  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, encrypted]);
}

type FetchLike = (url: string, init: { method: string; redirect?: 'manual'; headers: Record<string, string>; body: Buffer }) => Promise<{ status: number }>;

/** Send one notification. Never throws; returns an honest result. */
export async function sendPush(
  sub: PushSubscriptionJSON,
  payload: PushPayload,
  opts: { env?: Record<string, string | undefined>; fetchImpl?: FetchLike; now?: () => number } = {},
): Promise<SendResult> {
  const cfg = getVapidConfig(opts.env);
  if (!cfg) return { ok: false, code: 'NOT_CONFIGURED', message: NOT_CONFIGURED_MESSAGE };
  try {
    const body = JSON.stringify({
      title: payload.title.slice(0, 120),
      body: (payload.body ?? '').slice(0, 300),
      url: payload.url && /^\/(?![\/\\])/.test(payload.url) ? payload.url : '/',
    });
    const encrypted = encryptPayload(sub, Buffer.from(body));
    const audience = new URL(sub.endpoint).origin;
    const jwt = vapidJwt(cfg, audience, Math.floor((opts.now?.() ?? Date.now()) / 1000));
    const doFetch: FetchLike = opts.fetchImpl ?? ((url, init) => fetch(url, init as RequestInit));
    const res = await doFetch(sub.endpoint, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Authorization: `vapid t=${jwt}, k=${cfg.publicKey}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'normal',
      },
      body: encrypted,
    });
    if (res.status >= 200 && res.status < 300) return { ok: true, status: res.status };
    if (res.status === 404 || res.status === 410) {
      return { ok: false, code: 'GONE', status: res.status, message: 'This device is no longer subscribed.' };
    }
    return { ok: false, code: 'FAILED', status: res.status, message: `The push service answered ${res.status}.` };
  } catch (err) {
    return { ok: false, code: 'FAILED', message: err instanceof Error ? err.message : 'Could not reach the push service.' };
  }
}

/** Send to every stored owner device; prunes subscriptions the push service reports gone. */
export async function notifyOwner(payload: PushPayload): Promise<{ sent: number; removed: number; failed: number; notConfigured: boolean }> {
  if (!getVapidConfig()) return { sent: 0, removed: 0, failed: 0, notConfigured: true };
  const { listSubscriptions, removeSubscription } = await import('./store');
  let sent = 0;
  let removed = 0;
  let failed = 0;
  for (const sub of await listSubscriptions()) {
    const r = await sendPush(sub, payload);
    if (r.ok) sent++;
    else if (r.code === 'GONE') {
      await removeSubscription(sub.endpoint).catch(() => {});
      removed++;
    } else failed++;
  }
  return { sent, removed, failed, notConfigured: false };
}
