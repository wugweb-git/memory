import { NextRequest, NextResponse } from 'next/server';
import { mongo as prisma } from '@/lib/db/mongo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const testRunId = searchParams.get('test_run_id') || 'PROD';

    const entities = await prisma.entity.findMany({
      where: { processing_state: 'complete', test_run_id: testRunId },
      orderBy: { occurrences: 'desc' },
      take: 100
    });

    return NextResponse.json(entities);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
  }
}
