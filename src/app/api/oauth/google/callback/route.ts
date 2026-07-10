import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { consumeGoogleState, exchangeGoogleCode } from '@/lib/oauth/google';

export const dynamic = 'force-dynamic';

/**
 * GET /api/oauth/google/callback — Google redirects here with ?code&state.
 * We verify the CSRF state, exchange the code for tokens, then bounce the owner
 * back to where they started (default /integrations) with a status flag.
 */
export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');

  const { ok, returnTo } = await consumeGoogleState(state);
  const back = (status: string) => NextResponse.redirect(`${origin}${returnTo}?google=${status}`);

  if (error) return back('denied');
  if (!ok) return back('badstate');
  if (!code) return back('nocode');

  try {
    await exchangeGoogleCode(code, origin);
    return back('connected');
  } catch (err: any) {
    console.error('[OAuth/Google/Callback]', err);
    return back('error');
  }
}
