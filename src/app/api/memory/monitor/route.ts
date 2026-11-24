import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { postgres as prisma } from '@/lib/db/postgres';
import { loadMemoryStats } from '@/lib/stats/memory-stats';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const [packets, retries, sources, activity, documents, shared] = await Promise.all([
      prisma.memoryPacket.findMany({ where: { status: { not: 'rejected' }, test_run_id } }),
      prisma.packetRetryQueue.findMany({ where: { test_run_id } }),
      prisma.source.findMany({}),
      prisma.activityStream.findMany({ where: { test_run_id }, orderBy: { timestamp: 'desc' }, take: 50 }),
      prisma.document.findMany({ where: { test_run_id }, take: 100 }),
      loadMemoryStats(test_run_id),
    ]);

    const holdPackets = packets.filter((p: any) => p.processing_status === 'pending');
    const failedPackets = packets.filter((p: any) => p.processing_status === 'failed' || p.status === 'archived');

    const usedBytes = packets.reduce((acc: number, p: any) => 
      acc + (typeof p.content === 'string' ? p.content.length : JSON.stringify(p.content).length), 0);
    const totalBytes = 250 * 1024 * 1024;
    const usagePercent = Math.min(100, (usedBytes / totalBytes) * 100);

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPacketCount = packets.filter(
      (p: { ingestion_time?: Date }) => p.ingestion_time && new Date(p.ingestion_time) >= dayAgo,
    ).length;
    const ingestionLogs = await prisma.ingestionLog.findMany({
      where: { test_run_id },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        // Counts come from the shared definitions (src/lib/stats/memory-stats.ts).
        // hold_count = waiting for the embedder; failed_count = needs attention.
        // Use needs_attention for the single "needs attention" number (do not add hold + failed).
        packet_count: shared.total,
        hold_count: shared.backlog,
        failed_count: shared.needs_attention,
        needs_attention: shared.needs_attention,
        embedded_count: shared.embedded,
        not_searchable_count: shared.not_searchable,
        retry_queue_count: retries.length,
        source_count: sources.length,
        item_count: shared.total,
        growth_rate_per_day: recentPacketCount,
        ingestion_logs: ingestionLogs,
      },
      storage: {
        used_bytes: usedBytes,
        total_bytes: totalBytes,
        remaining_bytes: totalBytes - usedBytes,
        usage_percent: Number(usagePercent.toFixed(2)),
        ingestion_blocked: usagePercent >= 95,
        ingestion_restricted: usagePercent >= 85,
        alerts: []
      },
      sources,
      activity,
      documents,
      memory_stats: shared,
      review_queue: {
        pending: holdPackets,
        failed: failedPackets,
        correction: []
      }
    });
  } catch (error: any) {
    console.error('Monitor API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
