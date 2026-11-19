import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { getAutoPromoteMode, parseAutoPromoteBody, setAutoPromoteMode } from '@/lib/ingestion/connectors/auto-promote';

export const dynamic = 'force-dynamic';

/** GET — whether synced items are auto-promoted into memory: { mode: 'off' | 'trusted' | 'all' }. Owner only. */
export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json({ mode: await getAutoPromoteMode() });
}

/** PUT { mode } — choose the auto-promote mode. Owner only. */
export async function PUT(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const parsed = parseAutoPromoteBody(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    await setAutoPromoteMode(parsed.mode);
  } catch (err: any) {
    console.error('[API/Settings/AutoPromote]', err);
    return NextResponse.json({ error: 'Could not save the setting. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ mode: parsed.mode });
}
