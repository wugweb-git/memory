import { NextRequest, NextResponse } from 'next/server';
import { verifyHmacSignature, verifySharedToken } from '@/lib/webhooks/verify';
import { parseInboundEmail } from '@/lib/ingestion/email-inbound';
import { ingestEmail } from '@/lib/ingestion/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/webhooks/email — inbound email from a provider (Postmark / Resend /
 * generic). This route is public (the provider calls it, not the owner), so it
 * is protected by a webhook secret instead of the owner session:
 *
 *   - HMAC:  set INBOUND_EMAIL_SECRET; provider signs the body → `x-signature`.
 *   - Token: or set INBOUND_EMAIL_TOKEN; provider sends `?token=` / `x-webhook-token`.
 *
 * With neither secret configured the route refuses (503) — it never accepts
 * unauthenticated writes into the buffer.
 */
export async function POST(req: NextRequest) {
  const hmacSecret = process.env.INBOUND_EMAIL_SECRET;
  const token = process.env.INBOUND_EMAIL_TOKEN;

  if (!hmacSecret && !token) {
    return NextResponse.json(
      { error: 'Inbound email is not configured. Set INBOUND_EMAIL_SECRET (HMAC) or INBOUND_EMAIL_TOKEN.' },
      { status: 503 },
    );
  }

  // Read the raw body once — HMAC must run over the exact bytes received.
  const raw = await req.text();

  const signatureOk =
    hmacSecret && verifyHmacSignature(raw, req.headers.get('x-signature'), hmacSecret);
  const providedToken =
    req.headers.get('x-webhook-token') ?? new URL(req.url).searchParams.get('token');
  const tokenOk = token && verifySharedToken(providedToken, token);

  if (!signatureOk && !tokenOk) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = parseInboundEmail(payload);
  if (!email) {
    return NextResponse.json({ error: 'Could not parse from/body from payload' }, { status: 422 });
  }

  try {
    // Inbound mail authorship is unknown → held for review, never auto-promoted.
    const result = await ingestEmail(email, { autoPromote: false });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API/Webhooks/Email]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
