import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { ingestEmail } from '@/lib/ingestion/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/email
 * Body: { from, subject, body, to?, messageId?, autoPromote? }
 * Ingests an inbound email into the L0 blob buffer.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = checkRateLimit(`ingest:email:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await req.json();
    if (!body?.from || !body?.body) {
      return NextResponse.json({ error: 'from and body required' }, { status: 400 });
    }
    const result = await ingestEmail(
      {
        from: body.from,
        subject: body.subject,
        body: body.body,
        to: body.to,
        messageId: body.messageId,
      },
      { autoPromote: Boolean(body.autoPromote) }
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API/Ingest/Email]', err);
    const status = /required/.test(err?.message) ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
