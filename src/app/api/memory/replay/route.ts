import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { postgres as prisma } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const { packet_id } = await req.json();

    if (!packet_id) {
      return NextResponse.json({ error: 'packet_id is required' }, { status: 400 });
    }

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
