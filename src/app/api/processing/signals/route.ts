import { NextRequest, NextResponse } from 'next/server';
import { mongo as prisma } from '@/lib/db/mongo';
import { ProcessingEngine } from '@/lib/processing/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const signals = await prisma.signal.findMany({
      where: { test_run_id, processing_state: 'complete' },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return NextResponse.json(signals);
  } catch (error: any) {
    console.error('[API Signals] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { packetId } = await req.json();
    if (!packetId) return NextResponse.json({ error: 'packetId required' }, { status: 400 });

    const result = await ProcessingEngine.processPacket(packetId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
