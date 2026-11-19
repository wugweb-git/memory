import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { removeCustomFeed } from '@/lib/ingestion/connectors/config';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/sources/feeds/[id] — remove a feed the owner added. Owner-only. */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;
  const removed = await removeCustomFeed(id);
  if (!removed) return NextResponse.json({ error: 'Feed not found.' }, { status: 404 });
  return NextResponse.json({ id, removed: true });
}
