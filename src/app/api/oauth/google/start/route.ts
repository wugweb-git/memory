import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { primeCredentials } from '@/lib/publishing/credentials';
import { buildGoogleAuthUrl, googleClientConfigured, safeReturnTo } from '@/lib/oauth/google';

export const dynamic = 'force-dynamic';

/**
 * GET /api/oauth/google/start — owner clicks "Connect"; we redirect to Google's
 * consent screen. Requires GOOGLE_CLIENT_ID/SECRET to be set.
 */
export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  await primeCredentials();
  if (!googleClientConfigured()) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured. Add the Google client ID and secret under Integrations, Credentials.' },
      { status: 503 },
    );
  }

  const origin = new URL(req.url).origin;
  const returnTo = safeReturnTo(new URL(req.url).searchParams.get('returnTo'));
  const url = await buildGoogleAuthUrl(origin, returnTo);
  return NextResponse.redirect(url);
}
