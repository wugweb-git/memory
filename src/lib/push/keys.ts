import { createHash } from 'node:crypto';

/** Pure helpers for Web Push subscriptions. No DB, no network. */

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const B64URL = /^[A-Za-z0-9_-]+$/;
const MAX_ENDPOINT = 2048;

/** Stable short hash of a push endpoint (the endpoint itself is a bearer secret, so it is never used as a key). */
export function hashEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

/** scheduler_state key for a subscription. */
export function subscriptionKey(endpoint: string): string {
  return `push-sub:${hashEndpoint(endpoint)}`;
}

export const PUSH_SUB_PREFIX = 'push-sub:';

export function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function b64urlEncode(b: Buffer): string {
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type ParsedSubscription = { ok: true; subscription: PushSubscriptionJSON } | { ok: false; error: string };

/** Validate a browser PushSubscription JSON body. */
export function parseSubscription(body: unknown): ParsedSubscription {
  const b = (body && typeof body === 'object' ? (body as Record<string, unknown>) : null);
  const sub = b && typeof b.subscription === 'object' && b.subscription ? (b.subscription as Record<string, unknown>) : b;
  if (!sub) return { ok: false, error: 'A push subscription is required.' };
  const endpoint = sub.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > MAX_ENDPOINT) {
    return { ok: false, error: 'The subscription endpoint is missing or too long.' };
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, error: 'The subscription endpoint is not a valid URL.' };
  }
  if (url.protocol !== 'https:') return { ok: false, error: 'The subscription endpoint must use https.' };
  if (!isKnownPushHost(url.hostname)) return { ok: false, error: 'The subscription endpoint is not a known push service.' };
  const keys = sub.keys as Record<string, unknown> | undefined;
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (typeof p256dh !== 'string' || !B64URL.test(p256dh) || b64urlDecode(p256dh).length !== 65) {
    return { ok: false, error: 'The subscription p256dh key is invalid.' };
  }
  if (typeof auth !== 'string' || !B64URL.test(auth) || b64urlDecode(auth).length !== 16) {
    return { ok: false, error: 'The subscription auth key is invalid.' };
  }
  return { ok: true, subscription: { endpoint, keys: { p256dh, auth } } };
}

/** Body for DELETE: just the endpoint. */
export function parseEndpointBody(body: unknown): { ok: true; endpoint: string } | { ok: false; error: string } {
  const e = body && typeof body === 'object' ? (body as Record<string, unknown>).endpoint : null;
  if (typeof e !== 'string' || !e || e.length > MAX_ENDPOINT) return { ok: false, error: 'An endpoint is required.' };
  return { ok: true, endpoint: e };
}

/** Only real browser push services; the server POSTs to this URL, so never an arbitrary host. */
const PUSH_HOST_SUFFIXES = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
export function isKnownPushHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return PUSH_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith('.' + suffix));
}
