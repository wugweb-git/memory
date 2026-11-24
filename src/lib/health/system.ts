import { postgres as prisma } from '@/lib/db/postgres';
import { integrationsFromSources } from '@/lib/integrations/from-sources';
import { loadMemoryStats } from '@/lib/stats/memory-stats';
import { TRACKED_JOBS, summarizeJobRuns } from '@/lib/health/jobs-last-run';

export async function buildSystemHealth() {
  const [
    memoryStats,
    terminalFailures,
    activeLocks,
    staleLocks,
    semanticFallbacks,
    entityIsolation,
    systemSettings,
    sources,
    jobRuns,
  ] = await Promise.all([
    loadMemoryStats(),
    prisma.memoryPacket.count({ where: { attempt_count: { gte: 3 } } }),
    prisma.memoryPacket.count({ where: { processing_lock: true } }),
    prisma.memoryPacket.count({
      where: {
        processing_lock: true,
        locked_at: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    }),
    prisma.semanticObject.count({ where: { fallback: true } }),
    prisma.entity.groupBy({
      by: ['processing_state'],
      _count: true,
    }),
    prisma.systemSettings.findFirst(),
    prisma.source.findMany(),
    // Latest run per scheduled job (one query per job: cheap, uses the eventType+createdAt index).
    // A failed lookup must not break the health payload.
    Promise.all(
      TRACKED_JOBS.map((j) =>
        prisma.executionAuditLog
          .findFirst({ where: { eventType: j.eventType }, orderBy: { createdAt: 'desc' }, select: { eventType: true, status: true, createdAt: true } })
          .catch(() => null),
      ),
    ),
  ]);

  const totalPackets = memoryStats.total;
  const failedJobs = memoryStats.processing_failed;
  const processingStats = memoryStats.processing_distribution;
  let status: 'LOCKED' | 'DEGRADED' | 'BROKEN' = 'LOCKED';
  const failRate = totalPackets > 0 ? failedJobs / totalPackets : 0;
  const embeddedCount = memoryStats.embedded;
  const syncDensityPct = totalPackets > 0 ? Math.round((embeddedCount / totalPackets) * 100) : 0;
  const logicStabilityPct = Math.round((1 - failRate) * 100);
  const lockPressure = activeLocks > 5 ? 'high' : 'normal';

  if (failRate > 0.1 || terminalFailures > 5 || staleLocks > 2) {
    status = 'BROKEN';
  } else if (failRate > 0.02 || activeLocks > 10 || semanticFallbacks > 5) {
    status = 'DEGRADED';
  }

  const settingsValue = (systemSettings?.value as Record<string, unknown>) || {};
  if (settingsValue.system_status === 'maintenance') status = 'BROKEN';

  return {
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
      memory_stats: memoryStats,
      entity_isolation_state: entityIsolation,
      lock_pressure: lockPressure,
      fail_rate: Number(failRate.toFixed(4)),
      sync_density_pct: syncDensityPct,
      logic_stability_pct: logicStabilityPct,
    },
    integrations: integrationsFromSources(sources),
    jobs_last_run: summarizeJobRuns(jobRuns.filter((r): r is NonNullable<typeof r> => r !== null)),
    governance: {
      semantic_enabled: settingsValue.semantic_enabled ?? true,
      rag_enabled: settingsValue.rag_enabled ?? true,
      version: 'v1.1.0-hardened-distributed',
    },
    timestamp: new Date().toISOString(),
  };
}
