import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { DB_SETUP_HINT, isPrismaConfigError } from '@/lib/db/degraded';
import { loadMemoryStats, computeMemoryStats } from '@/lib/stats/memory-stats';

export const dynamic = 'force-dynamic';

/** Canonical memory packet counts. Definitions live in src/lib/stats/memory-stats.ts. */
export async function GET(req: NextRequest) {
  const gate = requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const testRunId = req.nextUrl.searchParams.get('test_run_id') || 'PROD';
    const stats = await loadMemoryStats(testRunId);
    return NextResponse.json({ ...stats, generated_at: new Date().toISOString() });
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json({ ...computeMemoryStats([]), generated_at: new Date().toISOString(), warning: DB_SETUP_HINT });
    }
    console.error('Memory stats error:', error);
    return NextResponse.json({ error: 'Could not load memory stats.' }, { status: 500 });
  }
}
