import { NextRequest, NextResponse } from 'next/server';
import { mongo } from '@/lib/db/mongo';

/**
 * GET /api/memory/get?id=...
 * Fetches full details of a specific MemoryPacket, including its associated
 * signals and semantic objects.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing packet ID' }, { status: 400 });
    }

    // 1. Fetch Packet (Source of Truth)
    const packet = await mongo.memoryPacket.findUnique({
      where: { id }
    });

    if (!packet) {
      return NextResponse.json({ error: 'Packet not found' }, { status: 404 });
    }

    // 2. Fetch Associated Signals (L2)
    const signals = await mongo.signal.findMany({
      where: { packet_id: id },
      orderBy: { timestamp: 'desc' }
    });

    // 3. Fetch Associated Semantic Object (L2.5)
    // There should ideally only be one per packet/version
    const semantic = await mongo.semanticObject.findFirst({
      where: { packet_id: id },
      orderBy: { timestamp: 'desc' }
    });

    return NextResponse.json({
      success: true,
      packet,
      signals,
      semantic
    });
  } catch (error: any) {
    console.error('[MemoryGetAPI] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
