import { NextResponse } from 'next/server';
import { postgres } from '@/lib/db/postgres';
import { DB_SETUP_HINT, isPrismaConfigError } from '@/lib/db/degraded';

export const dynamic = 'force-dynamic';

/** Public output pipeline health summary. */
export async function GET() {
  try {
    const [drafts, pushed, queued, published] = await Promise.all([
      postgres.outputLog.count({ where: { status: 'draft' } }).catch(() => 0),
      postgres.outputLog.count({ where: { status: 'pushed' } }).catch(() => 0),
      postgres.publishingQueue.count({ where: { status: { in: ['queued', 'scheduled', 'pending'] } } }).catch(() => 0),
      postgres.publishedOutput.count().catch(() => 0),
    ]);
    return NextResponse.json({
      status: 'ok',
      metrics: { drafts, pushed, queued, published },
    });
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json({
        status: 'degraded',
        warning: DB_SETUP_HINT,
        metrics: { drafts: 0, pushed: 0, queued: 0, published: 0 },
      });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
