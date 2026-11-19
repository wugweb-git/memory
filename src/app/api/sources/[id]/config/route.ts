import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { CONFIGURABLE, normalizeConfigValue, setConfigValue } from '@/lib/ingestion/connectors/config';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/sources/[id]/config — set up a source from the app.
 * Body: { value: string }. An empty value clears the setup. Owner-only.
 * Stores non-secret values only (username, channel id, feed URL).
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;
  if (!CONFIGURABLE[id]) {
    return NextResponse.json({ error: 'This source cannot be set up here.' }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const raw = typeof body?.value === 'string' ? body.value : '';
  if (raw.length > 500) return NextResponse.json({ error: 'That value is too long.' }, { status: 400 });

  if (!raw.trim()) {
    await setConfigValue(id, null);
    return NextResponse.json({ id, value: null });
  }
  const parsed = normalizeConfigValue(id, raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await setConfigValue(id, parsed.value);
  return NextResponse.json({ id, value: parsed.value });
}
