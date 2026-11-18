import { NextRequest, NextResponse } from 'next/server';
import { postgres } from '@/lib/db/postgres';
import { adminOrResponse, fail } from '@/lib/security/passkey-route';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const actor = adminOrResponse(req);
  if (actor instanceof NextResponse) return actor;
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return fail('Device id required', 400);
    const result = await postgres.passkeyCredential.deleteMany({ where: { id } });
    if (result.count === 0) return fail('Device not found', 404);
    return NextResponse.json({ ok: true });
  } catch {
    return fail('Could not remove device', 500);
  }
}
