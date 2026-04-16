import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const [
      totalCount,
      pendingCount,
      processingCount,
      embeddedCount,
      failedCount,
      sourceCount,
      recentLogs
    ] = await Promise.all([
      prisma.memoryPacket.count(),
      prisma.memoryPacket.count({ where: { embedding_status: 'pending' } }),
      prisma.memoryPacket.count({ where: { embedding_status: 'processing' } }),
      prisma.memoryPacket.count({ where: { embedding_status: 'embedded' } }),
      prisma.memoryPacket.count({ where: { embedding_status: 'failed' } }),
      prisma.source.count(),
      prisma.ingestionLog.findMany({
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
