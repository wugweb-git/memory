import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { postgres as prisma } from '@/lib/db/postgres';
import { DB_SETUP_HINT, isPrismaConfigError } from '@/lib/db/degraded';
import { parsePagination, LIST_ORDER_BY } from '@/lib/memory/list-pagination';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const { limit, offset } = parsePagination(searchParams);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const where: any = { test_run_id };
    if (type) where.type = type;
    if (source) where.source = source;
    if (status) where.status = status;

    const [packets, total] = await Promise.all([
      prisma.memoryPacket.findMany({
        where,
        orderBy: LIST_ORDER_BY,
        take: limit,
        skip: offset,
      }),
      prisma.memoryPacket.count({ where }),
    ]);

    return NextResponse.json({ packets, total, offset, limit });
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json({ packets: [], total: 0, offset: 0, limit: 10, warning: DB_SETUP_HINT });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Memory List API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
