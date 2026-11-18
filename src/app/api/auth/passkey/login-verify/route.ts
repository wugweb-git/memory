import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { postgres } from '@/lib/db/postgres';
import { INTERNAL_VAULT } from '@/config/vault';
import { IDENTITY_CONFIG } from '@/config/identity';
import { signToken } from '@/lib/security/jwt';
import { rememberedSessionCookie } from '@/lib/security/auth';
import { clearChallengeCookie } from '@/lib/security/passkey';
import { fail, readChallenge, rpOrResponse } from '@/lib/security/passkey-route';

export const dynamic = 'force-dynamic';

const GENERIC = 'Biometric sign-in failed';

export async function POST(req: NextRequest) {
  const rp = rpOrResponse(req);
  if (rp instanceof NextResponse) return rp;

  const challenge = readChallenge(req, 'login');
  if (!challenge) return fail('Sign-in expired, please try again', 400);

  try {
    const body = await req.json();
    const credentialId = typeof body?.response?.id === 'string' ? body.response.id : '';
    if (!credentialId) return fail(GENERIC, 401);

    const stored = await postgres.passkeyCredential.findUnique({ where: { credentialId } });
    if (!stored) return fail(GENERIC, 401);

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey),
        counter: stored.counter,
        transports: stored.transports as never,
      },
    });
    if (!verification.verified) return fail(GENERIC, 401);

    // Replay guard: a non-zero counter must strictly increase (the library also
    // checks this; enforced again here so it cannot silently regress).
    const newCounter = verification.authenticationInfo.newCounter;
    if ((newCounter !== 0 || stored.counter !== 0) && newCounter <= stored.counter) {
      return fail(GENERIC, 401);
    }
    await postgres.passkeyCredential.update({
      where: { credentialId },
      data: { counter: newCounter, lastUsedAt: new Date() },
    });

    const email = (INTERNAL_VAULT.ADMIN_EMAIL || IDENTITY_CONFIG.EMAIL).toLowerCase();
    const token = signToken(
      { sub: IDENTITY_CONFIG.DEFAULT_USER_ID, email, role: 'admin' },
      INTERNAL_VAULT.AUTH_SECRET,
    );
    const res = NextResponse.json({
      access_token: token,
      user: { id: IDENTITY_CONFIG.DEFAULT_USER_ID, email, role: 'admin' },
    });
    res.headers.append('Set-Cookie', rememberedSessionCookie(token, body?.remember));
    res.headers.append('Set-Cookie', clearChallengeCookie());
    return res;
  } catch {
    return fail(GENERIC, 401);
  }
}
