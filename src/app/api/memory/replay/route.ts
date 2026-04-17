import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { packet_id } = await req.json();

    if (!packet_id) {
      return NextResponse.json({ error: 'packet_id is required' }, { status: 400 });
    }

    // Logic for replay could be added here
    // For now, we'll just update the status
    await prisma.memoryPacket.update({
      where: { id: packet_id },
      data: { status: 'accepted', ingestion_time: new Date() }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Replay API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
