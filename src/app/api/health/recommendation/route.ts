import { NextResponse } from 'next/server';
import { postgres } from '@/lib/db/postgres';
import { DB_SETUP_HINT, isPrismaConfigError } from '@/lib/db/degraded';

export const dynamic = 'force-dynamic';

/** Public recommendation / automation health summary. */
export async function GET() {
  try {
    const [rulesEnabled, rulesTotal] = await Promise.all([
      postgres.automationRule.count({ where: { enabled: true } }).catch(() => 0),
      postgres.automationRule.count().catch(() => 0),
    ]);
    return NextResponse.json({
      status: 'ok',
      metrics: { rulesEnabled, rulesTotal },
    });
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json({
        status: 'degraded',
        warning: DB_SETUP_HINT,
        metrics: { rulesEnabled: 0, rulesTotal: 0 },
      });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
