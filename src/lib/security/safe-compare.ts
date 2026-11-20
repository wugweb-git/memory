import { createHash, timingSafeEqual } from 'crypto';

/** Constant-time string equality: both sides are hashed to equal-length digests first. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  return fwd.split(',')[0].trim() || 'unknown';
}

export const AUTH_RATE_LIMIT = 10;
export const AUTH_RATE_WINDOW_MS = 10 * 60_000;
