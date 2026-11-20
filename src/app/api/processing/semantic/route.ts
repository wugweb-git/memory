import { NextRequest, NextResponse } from 'next/server';
import { postgres as prisma } from '@/lib/db/postgres';
import { SemanticEngine } from '@/lib/processing/semantic';
import { readJsonObject, badRequest } from '@/lib/validation/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const testRunId = searchParams.get('test_run_id') || 'PROD';

    const semantic = await prisma.semanticObject.findMany({
      where: { processing_state: 'complete', test_run_id: testRunId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return NextResponse.json(semantic);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch semantic data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req);
    if (!body) return badRequest('JSON object body required');
    const { packetId } = body as { packetId?: string };
    if (!packetId) return NextResponse.json({ error: 'packetId required' }, { status: 400 });

    const result = await SemanticEngine.processSemantic(packetId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
