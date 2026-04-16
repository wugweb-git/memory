import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * /api/memory/signals
 * Fetches the most recent ingestion activity from the Unified Memory Engine (Postgres).
 */
export async function GET(req: NextRequest) {
  try {
    const packets = await prisma.memoryPacket.findMany({
      where: { status: 'accepted' },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    const activityEntries = packets.map(p => ({
      id: p.id,
      type: p.type === 'document' ? 'creation' : 'curation',
      action: p.type === 'document' ? 'UPLOADED' : 'SIGNAL_SAVED',
      target: p.content?.substring(0, 60) + '...',
      source: (p.metadata as any)?.source_id || 'unknown',
      sourceUrl: (p.metadata as any)?.source_url || '#',
      time: p.created_at.toLocaleString(),
      industry: (p.metadata as any)?.industry || 'Uncategorized',
      spiritNote: (p.metadata as any)?.spiritNote || p.content?.substring(0, 100) + '...'
    }));

    return NextResponse.json(activityEntries);
  } catch (error: any) {
    console.error('Signals Fetch Error:', error);
    return NextResponse.json([]);
  }
}
