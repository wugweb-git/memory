import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
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
  } catch (error: any) {
    console.error('Memory List API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
