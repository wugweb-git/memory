import { NextRequest, NextResponse } from 'next/server';
import { postgres } from '@/lib/db/postgres';
import { adminOrResponse, fail } from '@/lib/security/passkey-route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = adminOrResponse(req);
  if (actor instanceof NextResponse) return actor;
  try {
    const rows = await postgres.passkeyCredential.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true },
    });
    return NextResponse.json({ devices: rows });
  } catch {
    return fail('Could not load devices', 500);
  }
}
