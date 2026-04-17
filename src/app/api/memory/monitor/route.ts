import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';

    const [
      packets,
      retries,
      sources,
      activity,
      documents
    ] = await Promise.all([
      prisma.memoryPacket.findMany({ where: { status: { not: 'rejected' }, test_run_id } }),
      prisma.retryQueue.findMany({ where: { test_run_id } }),
      prisma.source.findMany({}),
      prisma.activityStream.findMany({ where: { test_run_id }, orderBy: { timestamp: 'desc' }, take: 50 }),
      prisma.document.findMany({ where: { test_run_id }, take: 100 })
    ]);

    const holdPackets = packets.filter(p => p.status === 'hold');
    const failedPackets = packets.filter(p => p.status === 'failed' || p.status === 'archived');
    
    // Calculate storage stats (simplified)
    const usedBytes = packets.reduce((acc, p) => acc + (typeof p.content === 'string' ? p.content.length : JSON.stringify(p.content).length), 0);
    const totalBytes = 250 * 1024 * 1024; // 250 MB
    const usagePercent = Math.min(100, (usedBytes / totalBytes) * 100);

    const body = {
      stats: {
        packet_count: packets.length,
        hold_count: holdPackets.length,
        failed_count: failedPackets.length,
        retry_queue_count: retries.length,
        source_count: sources.length,
        item_count: packets.length,
        growth_rate_per_day: 0, // Placeholder
        ingestion_logs: [] // Placeholder
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
      review_queue: {
        hold: holdPackets,
        failed: failedPackets,
        correction: []
      }
    };

    return NextResponse.json(body);
  } catch (error: any) {
    console.error('Monitor API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
