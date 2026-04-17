import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [
      totalPackets,
      failedJobs,
      terminalFailures,
      activeLocks,
      staleLocks,
      semanticFallbacks,
      processingStats,
      entityIsolation,
      systemSettings
    ] = await Promise.all([
      prisma.memoryPacket.count(),
      prisma.memoryPacket.count({ where: { processing_status: 'failed' } }),
      prisma.memoryPacket.count({ where: { attempt_count: { gte: 3 } } }),
      prisma.memoryPacket.count({ where: { processing_lock: true } }),
      prisma.memoryPacket.count({ 
        where: { 
          processing_lock: true, 
          locked_at: { lt: new Date(Date.now() - 10 * 60 * 1000) } // > 10 mins
        } 
      }),
      prisma.semanticObject.count({ where: { fallback: true } }),
      prisma.memoryPacket.groupBy({
        by: ['processing_status'],
        _count: true
      }),
      prisma.entity.groupBy({
        by: ['processing_state'],
        _count: true
      }),
      prisma.systemSettings.findFirst()
    ]);

    // Hardened Status Contract
    let status: 'LOCKED' | 'DEGRADED' | 'BROKEN' = 'LOCKED';
    
    const failRate = totalPackets > 0 ? (failedJobs / totalPackets) : 0;
    const lockPressure = activeLocks > 5 ? 'high' : 'normal';

    if (failRate > 0.1 || terminalFailures > 5 || staleLocks > 2) {
      status = 'BROKEN';
    } else if (failRate > 0.02 || activeLocks > 10 || semanticFallbacks > 5) {
      status = 'DEGRADED';
    }

    const settingsValue = systemSettings?.value as any || {};

    // Force broken if system explicitly locked or disabled
    if (settingsValue.system_status === 'maintenance') {
      status = 'BROKEN';
    }

    return NextResponse.json({
      status,
      core_integrity: status === 'LOCKED' ? 'PASSED' : 'VERIFY',
      metrics: {
        total_memory_packets: totalPackets,
        terminal_failures: terminalFailures,
        failed_jobs: failedJobs,
        active_locks: activeLocks,
        stale_locks: staleLocks,
        semantic_fallbacks: semanticFallbacks,
        processing_distribution: processingStats,
        entity_isolation_state: entityIsolation,
        lock_pressure: lockPressure,
        fail_rate: Number(failRate.toFixed(4))
      },
      governance: {
        semantic_enabled: settingsValue.semantic_enabled ?? true,
        rag_enabled: settingsValue.rag_enabled ?? true,
        version: 'v1.1.0-hardened-distributed'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`[HealthCheck] Fetch failed:`, error);
    return NextResponse.json(
      { status: 'BROKEN', error: 'METRICS_FETCH_FAILED', details: error.message },
      { status: 500 }
    );
  }
}
