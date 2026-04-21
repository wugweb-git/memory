import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/processing/entities
 * Returns a list of normalized entities across the system.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const testRunId = searchParams.get('test_run_id') || 'PROD';

    const entities = await prisma.entity.findMany({
      where: {
        processing_state: 'complete',
        test_run_id: testRunId
      },
      orderBy: { occurrences: 'desc' },
      take: 100
    });

    return NextResponse.json(entities);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
  }
}
