import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { ingestNotion } from '@/lib/ingestion/notion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/ingest/notion
 * Body: { query?, autoPromote? } — syncs the most recently edited Notion
 * pages shared with the internal integration (NOTION_TOKEN) into the buffer.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`ingest:notion:${actor.userId}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    const result = await ingestNotion({
      query: typeof body.query === 'string' ? body.query : undefined,
      autoPromote: Boolean(body.autoPromote),
    });
    return NextResponse.json(result);
  } catch (err: any) {
    if (String(err?.message).startsWith('NOTION_NOT_CONFIGURED')) {
      return NextResponse.json(
        { error: 'Notion is not connected. Create an internal integration at notion.so/my-integrations, share your pages with it, and set NOTION_TOKEN.' },
        { status: 503 },
      );
    }
    console.error('[API/Ingest/Notion]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
