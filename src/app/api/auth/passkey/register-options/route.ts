import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { postgres } from '@/lib/db/postgres';
import { INTERNAL_VAULT } from '@/config/vault';
import { IDENTITY_CONFIG } from '@/config/identity';
import { challengeCookie, signChallenge } from '@/lib/security/passkey';
import { adminOrResponse, fail, rpOrResponse } from '@/lib/security/passkey-route';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { clientIp, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS } from '@/lib/security/safe-compare';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const actor = adminOrResponse(req);
  if (actor instanceof NextResponse) return actor;
  const rp = rpOrResponse(req);
  if (rp instanceof NextResponse) return rp;

  const limit = await checkRateLimit(`passkey-register:${actor.userId ?? clientIp(req)}`, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS);
  if (!limit.allowed) return fail('Too many attempts, try again in a few minutes', 429);

  try {
    const existing = await postgres.passkeyCredential.findMany({ select: { credentialId: true, transports: true } });
    const options = await generateRegistrationOptions({
      rpName: 'Identity Prism',
      rpID: rp.rpID,
      userName: actor.email || IDENTITY_CONFIG.EMAIL,
      userID: new TextEncoder().encode(IDENTITY_CONFIG.DEFAULT_USER_ID),
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports as never,
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    });
    const res = NextResponse.json(options);
    res.headers.set('Set-Cookie', challengeCookie(signChallenge('register', options.challenge, INTERNAL_VAULT.AUTH_SECRET)));
    return res;
  } catch {
    return fail('Could not start biometric setup', 500);
  }
}
