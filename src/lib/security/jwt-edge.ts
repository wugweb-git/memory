/**
 * Edge-safe JWT verification (Web Crypto only — no Node builtins).
 *
 * The middleware runs on Vercel's Edge runtime, where `node:crypto`/`Buffer`
 * are unavailable; importing the Node verifier there crashes every matched
 * request with MIDDLEWARE_INVOCATION_FAILED. This mirrors the HS256 scheme in
 * `jwt.ts` exactly (base64url(header).base64url(payload).hmac-sha256).
 * Node route handlers should keep using `jwt.ts`.
 */

import type { JwtPayload } from './jwt';

function base64urlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const bin = atob(base64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256Base64url(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bytesToBase64url(new Uint8Array(sig));
}

/** Constant-time string comparison (both inputs are same-alphabet base64url). */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyTokenEdge(token: string, secret: string): Promise<JwtPayload | null> {
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const expected = await hmacSha256Base64url(`${header}.${body}`, secret);
  if (!timingSafeEqualStr(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64urlToUtf8(body)) as JwtPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sub || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}
