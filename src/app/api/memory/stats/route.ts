import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { postgres as prisma } from '@/lib/db/postgres';
import { degradedMemoryStats, isPrismaConfigError } from '@/lib/db/degraded';
import { loadMemoryStats } from '@/lib/stats/memory-stats';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const [shared, sourceCount, recentLogs] = await Promise.all([
      loadMemoryStats(test_run_id),
      prisma.source.count(),
      prisma.ingestionLog.findMany({
        where: { test_run_id },
        orderBy: { timestamp: 'desc' },
        take: 10
      })
    ]);

    return NextResponse.json({
      total_packets: shared.total,
      embedding_stats: {
        pending: shared.pending,
        processing: shared.processing,
        embedded: shared.embedded,
        failed: shared.failed
      },
      // Shared definitions (src/lib/stats/memory-stats.ts), identical to /api/stats/memory.
      memory_stats: shared,
      source_count: sourceCount,
      recent_ingestion_logs: recentLogs
    });
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json(degradedMemoryStats());
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
