import { NextRequest, NextResponse } from 'next/server';
import { postgres as prisma } from '@/lib/db/postgres';
import { aggregateTopics } from '@/lib/semantic/topics';

export const dynamic = 'force-dynamic';

/**
 * Topics are aggregated from SemanticObject.topics (the `topics` table has no writer).
 * Shape stays Topic-compatible (id, name, strength, packet_ids, last_updated) plus
 * mentions / inferred.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const rows = await prisma.semanticObject.findMany({
      where: { test_run_id, processing_state: 'complete' },
      orderBy: { timestamp: 'desc' },
      take: 500,
      select: { packet_id: true, topics: true, fallback: true, timestamp: true },
    });

    return NextResponse.json(aggregateTopics(rows, 50));
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
