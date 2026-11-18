import { NextRequest, NextResponse } from 'next/server';
import { INTERNAL_VAULT } from '@/config/vault';
import { getRequestUser, type RequestActor } from '@/lib/security/auth';
import { hasPermission } from '@/lib/security/roles';
import {
  CHALLENGE_COOKIE,
  resolveRelyingParty,
  verifyChallenge,
  type ChallengePurpose,
  type RelyingParty,
} from '@/lib/security/passkey';

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Authenticated admin session only (the single owner). */
export function adminOrResponse(req: NextRequest): RequestActor | NextResponse {
  const actor = getRequestUser(req);
  if (!actor.authenticated || !hasPermission(actor.role, 'admin:read')) {
    return fail('Admin access required', 401);
  }
  return actor;
}

export function rpOrResponse(req: NextRequest): RelyingParty | NextResponse {
  const rp = resolveRelyingParty(req.headers.get('host'));
  return rp ?? fail('Biometric sign-in is not available on this address', 400);
}

export function readChallenge(req: NextRequest, purpose: ChallengePurpose): string | null {
  return verifyChallenge(req.cookies.get(CHALLENGE_COOKIE)?.value, purpose, INTERNAL_VAULT.AUTH_SECRET);
}
