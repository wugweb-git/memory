import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { buildGoogleAuthUrl, googleClientConfigured } from '@/lib/oauth/google';

export const dynamic = 'force-dynamic';

/**
 * GET /api/oauth/google/start — owner clicks "Connect"; we redirect to Google's
 * consent screen. Requires GOOGLE_CLIENT_ID/SECRET to be set.
 */
export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  if (!googleClientConfigured()) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' },
      { status: 503 },
    );
  }

  const origin = new URL(req.url).origin;
  const returnTo = new URL(req.url).searchParams.get('returnTo') || '/integrations';
  const url = await buildGoogleAuthUrl(origin, returnTo);
  return NextResponse.redirect(url);
}
