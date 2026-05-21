import { NextRequest, NextResponse } from 'next/server';
import { buildSystemHealth } from '@/lib/health/system';
import { requireAdmin } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  try {
    const health = await buildSystemHealth();
    return NextResponse.json({ ...health, actor: gate.userId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HealthCheck] Fetch failed:', error);
    return NextResponse.json(
      { status: 'BROKEN', error: 'METRICS_FETCH_FAILED', details: message },
      { status: 500 },
    );
  }
}
