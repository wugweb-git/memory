import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { INTERNAL_VAULT } from '@/config/vault';
import { challengeCookie, signChallenge } from '@/lib/security/passkey';
import { fail, rpOrResponse } from '@/lib/security/passkey-route';

export const dynamic = 'force-dynamic';

/** Anonymous. Discoverable credentials: the device picks the passkey, so no account hint is leaked. */
export async function POST(req: NextRequest) {
  const rp = rpOrResponse(req);
  if (rp instanceof NextResponse) return rp;
  try {
    const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: 'required' });
    const res = NextResponse.json(options);
    res.headers.set('Set-Cookie', challengeCookie(signChallenge('login', options.challenge, INTERNAL_VAULT.AUTH_SECRET)));
    return res;
  } catch {
    return fail('Could not start biometric sign-in', 500);
  }
}
