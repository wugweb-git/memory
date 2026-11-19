import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { postgres as prisma } from '@/lib/db/postgres';
import { DB_SETUP_HINT, isPrismaConfigError } from '@/lib/db/degraded';
import { clampLimit } from '@/lib/validation/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const limit = clampLimit(searchParams.get('limit'), 10, 200);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const where: any = { test_run_id };
    if (type) where.type = type;
    if (source) where.source = source;
    if (status) where.status = status;

    const packets = await prisma.memoryPacket.findMany({
      where,
      orderBy: { ingestion_time: 'desc' },
      take: limit
    });

    return NextResponse.json({ packets });
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json({ packets: [], warning: DB_SETUP_HINT });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Memory List API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
