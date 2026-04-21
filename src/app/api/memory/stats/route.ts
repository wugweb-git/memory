import { NextRequest, NextResponse } from 'next/server';
import { mongo as prisma } from '@/lib/db/mongo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const [totalCount, pendingCount, processingCount, embeddedCount, failedCount, sourceCount, recentLogs] =
      await Promise.all([
        prisma.memoryPacket.count({ where: { test_run_id } }),
        prisma.memoryPacket.count({ where: { embedding_status: 'pending', test_run_id } }),
        prisma.memoryPacket.count({ where: { embedding_status: 'processing', test_run_id } }),
        prisma.memoryPacket.count({ where: { embedding_status: 'embedded', test_run_id } }),
        prisma.memoryPacket.count({ where: { embedding_status: 'failed', test_run_id } }),
        prisma.source.count(),
        prisma.ingestionLog.findMany({
          where: { test_run_id },
          orderBy: { timestamp: 'desc' },
          take: 10
        })
      ]);

    return NextResponse.json({
      total_packets: totalCount,
      embedding_stats: {
        pending: pendingCount,
        processing: processingCount,
        embedded: embeddedCount,
        failed: failedCount
      },
      source_count: sourceCount,
      recent_ingestion_logs: recentLogs
    });
  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
