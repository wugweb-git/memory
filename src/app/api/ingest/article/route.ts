import { NextRequest, NextResponse } from 'next/server';
import { ingestExternalArticle } from '@/lib/ingestion/article';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/article
 * Body: { url, title?, content?, autoPromote? }
 * Ingests an external article into the L0 blob buffer.
 */
export async function POST(req: NextRequest) {
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
