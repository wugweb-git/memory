import { createHmac, timingSafeEqual } from 'crypto';

/** Hosts the owner passkeys are allowed to be created and used on. */
export const PASSKEY_ALLOWED_HOSTS = [
  'www.vedanshusrivastava.com',
  'vedanshusrivastava.com',
  'memory-wugweb.vercel.app',
  'localhost',
] as const;

export const CHALLENGE_COOKIE = 'prism_passkey_challenge';
export const CHALLENGE_TTL_SEC = 300;

export type RelyingParty = { rpID: string; origin: string };

/** Resolve rpID and origin from a Host header, or null when not allow-listed. */
export function resolveRelyingParty(hostHeader: string | null | undefined): RelyingParty | null {
  if (!hostHeader) return null;
  const host = hostHeader.trim().toLowerCase();
  const m = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/.exec(host);
  if (!m) return null;
  const hostname = m[1];
  if (!(PASSKEY_ALLOWED_HOSTS as readonly string[]).includes(hostname)) return null;
  if (hostname === 'localhost') {
    return { rpID: hostname, origin: `http://${host}` };
  }
  if (m[2]) return null; // production hosts are https on the default port only
  return { rpID: hostname, origin: `https://${hostname}` };
}

export type ChallengePurpose = 'register' | 'login';

function mac(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** Signed value: purpose.challenge.expiry.signature (challenge is base64url, no dots). */
export function signChallenge(
  purpose: ChallengePurpose,
  challenge: string,
  secret: string,
  now = Date.now(),
  ttlSec = CHALLENGE_TTL_SEC,
): string {
  const exp = Math.floor(now / 1000) + ttlSec;
  const body = `${purpose}.${challenge}.${exp}`;
  return `${body}.${mac(body, secret)}`;
}

/** Returns the challenge when signature, purpose and expiry are all valid. */
export function verifyChallenge(
  value: string | undefined | null,
  purpose: ChallengePurpose,
  secret: string,
  now = Date.now(),
): string | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [p, challenge, exp, sig] = parts;
  const expected = mac(`${p}.${challenge}.${exp}`, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (p !== purpose) return null;
  if (!Number.isFinite(Number(exp)) || Number(exp) < Math.floor(now / 1000)) return null;
  return challenge;
}

export function challengeCookie(signed: string, ttlSec = CHALLENGE_TTL_SEC): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${CHALLENGE_COOKIE}=${signed}; Path=/api/auth/passkey; HttpOnly; SameSite=Strict; Max-Age=${ttlSec}${secure}`;
}

export function clearChallengeCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${CHALLENGE_COOKIE}=; Path=/api/auth/passkey; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

/** Trim and bound a user-supplied device name. */
export function cleanDeviceName(input: unknown): string {
  const s = typeof input === 'string' ? input.replace(/[\u0000-\u001f]/g, ' ').trim() : '';
  return (s || 'This device').slice(0, 60);
}
