import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProcessingEngine } from '@/lib/processing/engine';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/processing/signals
 * Returns a stream of extracted signals for the timeline.
 */
export async function GET(req: NextRequest) {
  try {
    const signals = await prisma.signal.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return NextResponse.json(signals);
  } catch (error: any) {
    console.error('[API Signals] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
}

/**
 * POST /api/processing/signals
 * Triggers a manual reprocess for a specific packet (Validation Tool).
 */
export async function POST(req: NextRequest) {
  try {
    const { packetId } = await req.json();
    if (!packetId) return NextResponse.json({ error: 'packetId required' }, { status: 400 });

    // Note: In manual mode, we allow direct engine call for testing/validation
    const result = await ProcessingEngine.processPacket(packetId);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
