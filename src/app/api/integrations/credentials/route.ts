import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { clearCredential, INTEGRATION_ACCOUNTS, listIntegrationStatus, setCredential } from '@/lib/publishing/credentials';

export const dynamic = 'force-dynamic';

const INTEGRATION_KEYS = new Set(INTEGRATION_ACCOUNTS.flatMap((a) => a.fields.map((f) => f.key)));

/** GET — which integration credentials are set (app or env) with the last 4 characters. Never returns values. Admin only. */
export async function GET(req: NextRequest) {
  const actor = requireAdmin(req);
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json(await listIntegrationStatus());
}

/** PUT { key, value } — save a credential; secrets are stored encrypted. Admin only. */
export async function PUT(req: NextRequest) {
  const actor = requireAdmin(req);
  if (actor instanceof NextResponse) return actor;
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === 'string' ? body.key : '';
  if (!INTEGRATION_KEYS.has(key)) return NextResponse.json({ error: 'Unknown credential.' }, { status: 404 });
  const result = await setCredential(key, typeof body?.value === 'string' ? body.value : '');
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ key, set: true });
}

/** DELETE ?key= — remove the value saved in the app (an env var of the same name still applies). Admin only. */
export async function DELETE(req: NextRequest) {
  const actor = requireAdmin(req);
  if (actor instanceof NextResponse) return actor;
  const key = req.nextUrl.searchParams.get('key') ?? '';
  if (!INTEGRATION_KEYS.has(key)) return NextResponse.json({ error: 'Unknown credential.' }, { status: 404 });
  await clearCredential(key);
  return NextResponse.json({ key, set: false });
}
