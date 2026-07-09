import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Real HMAC-SHA256 webhook signature verification (constant-time).
 *
 * NOTE: this replaces an earlier placeholder that only checked the signature
 * length. Any route using it now performs a genuine cryptographic check.
 *
 * The signature header may be a bare digest or prefixed (`sha256=<hex>`), in
 * hex or base64. Returns false on any mismatch, missing input, or length skew.
 */
export function verifyHmacSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;

  // Strip only a known algorithm prefix (e.g. "sha256="); do NOT split on any
  // "=", since base64 digests legitimately end with "=" padding.
  const provided = signature.trim().replace(/^sha(?:1|256)=/i, '');
  if (!provided) return false;

  const expectedHex = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  const expectedB64 = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

  return safeEqual(provided, expectedHex) || safeEqual(provided, expectedB64);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * Constant-time comparison of a shared secret token (for providers that only
 * offer a static inbound token rather than HMAC signing).
 */
export function verifySharedToken(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false;
  return safeEqual(provided, expected);
}

/**
 * Back-compat shim for the previous signature. Prefer `verifyHmacSignature`.
 * @deprecated use verifyHmacSignature(body, signature, secret)
 */
export function verifySignedWebhook(signature: string | null, secret: string, body: string): boolean {
  return verifyHmacSignature(body, signature, secret);
}
