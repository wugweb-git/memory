import { NextResponse } from 'next/server';
import { buildSystemHealth } from '@/lib/health/system';
import { degradedSystemHealth, isPrismaConfigError } from '@/lib/db/degraded';

export const dynamic = 'force-dynamic';

/** Public system health metrics for dashboard UI (no admin role required). */
export async function GET() {
  try {
    return NextResponse.json(await buildSystemHealth());
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json(degradedSystemHealth());
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Health System]', error);
    return NextResponse.json(
      { status: 'BROKEN', error: 'METRICS_FETCH_FAILED', details: message },
      { status: 500 },
    );
  }
}
