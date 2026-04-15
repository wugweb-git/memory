import { NextRequest, NextResponse } from 'next/server';
import { createBlobItem, enforceBlobRateLimit, listBlobEvents, listBlobItems } from '@/lib/blobLayer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || undefined;
  const source = searchParams.get('source') || undefined;
  const state = searchParams.get('state') || undefined;
  const limit = Number(searchParams.get('limit') || 20);
  const offset = Number(searchParams.get('offset') || 0);
  const includeEvents = searchParams.get('include_events') === 'true';

  let items = await listBlobItems({ limit, offset });
  if (type) items = items.filter((row: any) => row.type === String(type).toLowerCase());
  if (source) items = items.filter((row: any) => row.source === String(source).toLowerCase());
  if (state) items = items.filter((row: any) => row.state === String(state).toLowerCase());
  const events = includeEvents ? await listBlobEvents(10) : undefined;
  return NextResponse.json({ items, events });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    enforceBlobRateLimit(req.headers.get('x-forwarded-for') || 'global');
    const item = await createBlobItem({
      type: body?.type,
      source: body?.source,
      content: body?.content,
      expires_at: body?.expires_at || null,
      pinned: Boolean(body?.pinned),
      source_id: body?.source_id || 'unknown',
      environment: body?.environment || process.env.NODE_ENV || 'unknown'
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to store blob item' }, { status: 400 });
  }
}
