import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/processing/topics
 * Returns a distribution of thematic topics across the memory store.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const topics = await prisma.topic.findMany({
      where: { 
        test_run_id,
        processing_state: 'complete'
      },
      orderBy: { strength: 'desc' },
      take: 50
    });

    return NextResponse.json(topics);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
