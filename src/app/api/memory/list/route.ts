import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const limit = Number(searchParams.get('limit')) || 20;

    const where: any = {};
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
