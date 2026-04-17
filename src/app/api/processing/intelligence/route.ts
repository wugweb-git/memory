import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { IntelligenceEngine } from '@/lib/processing/intelligence';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/processing/intelligence
 * Returns behavioral patterns and descriptive insights.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const patterns = await prisma.pattern.findMany({
      where: {
        test_run_id,
        processing_state: 'complete'
      },
      orderBy: { last_detected: 'desc' }
    });

    return NextResponse.json({
      patterns,
      system_state: 'nominal',
      last_refresh: patterns[0]?.last_detected || new Date().toISOString(),
      test_run_id
    });
  } catch (error: any) {
    console.error('[API Intelligence] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch intelligence' }, { status: 500 });
  }
}

/**
 * POST /api/processing/intelligence
 * Triggers a manual refresh of the pattern detection engine.
 */
export async function POST(req: NextRequest) {
  try {
    await IntelligenceEngine.scoringEngine();
    await IntelligenceEngine.detectPatterns();
    
    return NextResponse.json({ status: 'Intelligence refresh completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
