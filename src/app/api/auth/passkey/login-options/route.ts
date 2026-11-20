import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { INTERNAL_VAULT } from '@/config/vault';
import { challengeCookie, signChallenge } from '@/lib/security/passkey';
import { fail, rpOrResponse } from '@/lib/security/passkey-route';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { clientIp, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS } from '@/lib/security/safe-compare';

export const dynamic = 'force-dynamic';

/** Anonymous. Discoverable credentials: the device picks the passkey, so no account hint is leaked. */
export async function POST(req: NextRequest) {
  const rp = rpOrResponse(req);
  if (rp instanceof NextResponse) return rp;
  const limit = await checkRateLimit(`passkey-login:ip:${clientIp(req)}`, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS);
  if (!limit.allowed) return fail('Too many sign-in attempts, try again in a few minutes', 429);
  try {
    const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: 'required' });
    const res = NextResponse.json(options);
    res.headers.set('Set-Cookie', challengeCookie(signChallenge('login', options.challenge, INTERNAL_VAULT.AUTH_SECRET)));
    return res;
  } catch {
    return fail('Could not start biometric sign-in', 500);
  }
}
