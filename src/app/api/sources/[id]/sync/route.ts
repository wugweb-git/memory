import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getConnector, syncConnector } from '@/lib/ingestion/connectors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/sources/[id]/sync — run one connector on demand ("Sync now").
 * Body: { autoPromote? }. Owner-only + rate-limited.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;
  const connector = getConnector(id);
  if (!connector) {
    return NextResponse.json({ error: `Unknown source: ${id}` }, { status: 404 });
  }
  if (connector.kind === 'manual') {
    return NextResponse.json(
      { error: `${connector.label} is captured manually from the Buffer surface — nothing to sync.` },
      { status: 400 },
    );
  }
  if (!connector.configured()) {
    return NextResponse.json(
      { error: `${connector.label} is not connected. ${connector.setupHint}` },
      { status: 503 },
    );
  }

  const limit = await checkRateLimit(`sources:sync:${actor.userId}:${id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    const result = await syncConnector(id, { autoPromote: Boolean(body?.autoPromote) });
    if (result?.error) {
      return NextResponse.json({ id, ...result }, { status: 502 });
    }
    return NextResponse.json({ id, ...result });
  } catch (err: any) {
    console.error('[API/Sources/Sync]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
