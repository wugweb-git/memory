import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SemanticEngine } from '@/lib/processing/semantic';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/processing/semantic
 * Returns semantic objects (entities, intents, topics) associated with packets.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const testRunId = searchParams.get('test_run_id') || 'PROD';

    const semantic = await prisma.semanticObject.findMany({
      where: {
        processing_state: 'complete',
        test_run_id: testRunId
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return NextResponse.json(semantic);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch semantic data' }, { status: 500 });
  }
}

/**
 * POST /api/processing/semantic
 * Manually trigger semantic enrichment for a packet (Validation Tool).
 */
export async function POST(req: NextRequest) {
  try {
    const { packetId } = await req.json();
    if (!packetId) return NextResponse.json({ error: 'packetId required' }, { status: 400 });

    const result = await SemanticEngine.processSemantic(packetId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
