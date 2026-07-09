import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { listConnectorStatuses } from '@/lib/ingestion/connectors';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/sources — every connector with live status (configured?, last sync,
 * last result, last error). Owner-only.
 */
export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  try {
    const connectors = await listConnectorStatuses();
    return NextResponse.json({ connectors });
  } catch (err: any) {
    console.error('[API/Sources]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
