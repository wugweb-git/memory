import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { ingestDeviceCapture, type DeviceCaptureKind } from '@/lib/ingestion/device';

export const dynamic = 'force-dynamic';

const VALID_KINDS: DeviceCaptureKind[] = ['geolocation', 'clipboard', 'notification'];

/**
 * POST /api/ingest/device
 * Body: { kind: 'geolocation'|'clipboard'|'notification', data: {...} }
 * Owner-only + rate-limited. The browser has already prompted for permission
 * before this is called — the server just persists the captured signal.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const limit = await checkRateLimit(`ingest:device:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    if (!VALID_KINDS.includes(body?.kind)) {
      return NextResponse.json({ error: `kind must be one of ${VALID_KINDS.join(', ')}` }, { status: 400 });
    }
    if (!body?.data || typeof body.data !== 'object') {
      return NextResponse.json({ error: 'data object required' }, { status: 400 });
    }
    const result = await ingestDeviceCapture({ kind: body.kind, data: body.data });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API/Ingest/Device]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
