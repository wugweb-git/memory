import { NextRequest, NextResponse } from 'next/server';
import { mongo as prisma } from '@/lib/db/mongo';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { action, packet_id } = await req.json();

    if (!packet_id) {
      return NextResponse.json({ error: 'packet_id is required' }, { status: 400 });
    }

    if (action === 'delete') {
      await prisma.memoryPacket.delete({ where: { id: packet_id } });
    } else if (action === 'move_to_blob') {
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
