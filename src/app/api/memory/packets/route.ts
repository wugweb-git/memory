import { NextRequest, NextResponse } from 'next/server';
import { mongo as prisma } from '@/lib/db/mongo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const count = Number(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const source = searchParams.get('source');

    const where: any = { status: { not: 'rejected' } };
    if (status) where.status = status;
    if (source) where.source = source;

    const packets = await prisma.memoryPacket.findMany({
      where,
      orderBy: { ingestion_time: 'desc' },
      take: count
    });

    return NextResponse.json({ rows: packets });
  } catch (error: any) {
    console.error('Packets API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
