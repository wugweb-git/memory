import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { postgres } from '@/lib/db/postgres';
import { cleanDeviceName, clearChallengeCookie } from '@/lib/security/passkey';
import { adminOrResponse, fail, readChallenge, rpOrResponse } from '@/lib/security/passkey-route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const actor = adminOrResponse(req);
  if (actor instanceof NextResponse) return actor;
  const rp = rpOrResponse(req);
  if (rp instanceof NextResponse) return rp;

  const challenge = readChallenge(req, 'register');
  if (!challenge) return fail('Setup expired, please try again', 400);

  try {
    const body = await req.json();
    const verification = await verifyRegistrationResponse({
      response: body?.response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) return fail('Could not verify this device', 400);

    const { credential } = verification.registrationInfo;
    await postgres.passkeyCredential.create({
      data: {
        credentialId: credential.id,
        publicKey: new Uint8Array(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceName: cleanDeviceName(body?.deviceName),
      },
    });
    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', clearChallengeCookie());
    return res;
  } catch {
    return fail('Could not verify this device', 400);
  }
}
