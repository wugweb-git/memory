import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [
      totalPackets,
      failedEmbeddings,
      semanticFallbacks,
      retryQueueCount,
      processingStats
    ] = await Promise.all([
      prisma.memoryPacket.count(),
      prisma.memoryPacket.count({ where: { embedding_status: 'failed' } }),
      prisma.semanticObject.count({ where: { fallback: true } }),
      prisma.memoryPacket.count({ where: { retry_count: { gt: 0 }, status: 'active' } }),
      prisma.memoryPacket.groupBy({
        by: ['processing_status'],
        _count: true
      })
    ]);

    // System Health Score (Simplified)
    const healthScore = totalPackets > 0 
      ? Math.max(0, 100 - (failedEmbeddings / totalPackets) * 50 - (retryQueueCount / totalPackets) * 20)
      : 100;

    return NextResponse.json({
      health_score: Math.round(healthScore),
      metrics: {
        total_memory_packets: totalPackets,
        failed_embeddings: failedEmbeddings,
        semantic_fallbacks: semanticFallbacks,
        active_retry_queue: retryQueueCount,
        processing_distribution: processingStats
      },
      status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'degraded' : 'critical',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'METRICS_FETCH_FAILED', details: error.message },
      { status: 500 }
    );
  }
}
