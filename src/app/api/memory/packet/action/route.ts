import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { action, packet_id } = await req.json();

    if (!packet_id) {
      return NextResponse.json({ error: 'packet_id is required' }, { status: 400 });
    }

    if (action === 'delete') {
      await prisma.memoryPacket.delete({ where: { id: packet_id } });
    } else if (action === 'move_to_blob') {
      // Logic for moving to blob could be added here
      await prisma.memoryPacket.update({
        where: { id: packet_id },
        data: { status: 'archived' }
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Packet Action API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
