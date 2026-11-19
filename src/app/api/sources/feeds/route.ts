import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { addCustomFeed } from '@/lib/ingestion/connectors/config';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sources/feeds — add an RSS or Atom feed as a source.
 * Body: { label?: string, url: string }. Owner-only.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === 'string' ? body.url : '';
  const label = typeof body?.label === 'string' ? body.label : '';
  if (!url.trim() || url.length > 500) {
    return NextResponse.json({ error: 'Enter the feed address.' }, { status: 400 });
  }
  const res = await addCustomFeed(label, url);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ feed: res.feed }, { status: 201 });
}
