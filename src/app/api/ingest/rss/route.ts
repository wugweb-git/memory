import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { ingestRss } from '@/lib/ingestion/rss';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/rss
 * Body: { feedUrl, items?, autoPromote? } — with only feedUrl, the feed is
 * fetched + parsed server-side (RSS 2.0/Atom). One blob item per entry.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`ingest:rss:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await req.json();
    if (!body?.feedUrl) {
      return NextResponse.json({ error: 'feedUrl required' }, { status: 400 });
    }
    const result = await ingestRss(
      { feedUrl: body.feedUrl, items: Array.isArray(body.items) ? body.items : undefined },
      { autoPromote: Boolean(body.autoPromote) }
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API/Ingest/Rss]', err);
    const status = /required/.test(err?.message) ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
