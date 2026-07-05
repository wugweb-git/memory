import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { ingestExternalArticle } from '@/lib/ingestion/article';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/article
 * Body: { url, title?, content?, autoPromote? }
 * Ingests an external article into the L0 blob buffer.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`ingest:article:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await req.json();
    if (!body?.url) {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }
    const result = await ingestExternalArticle(
      { url: body.url, title: body.title, content: body.content },
      { autoPromote: Boolean(body.autoPromote) }
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API/Ingest/Article]', err);
    const status = /required/.test(err?.message) ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
