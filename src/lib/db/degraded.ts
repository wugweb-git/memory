/** Detect Prisma init failures when env vars are missing (local dev without .env.local). */
export function isPrismaConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    error.name === 'PrismaClientInitializationError' ||
    msg.includes('Environment variable not found') ||
    msg.includes('MONGODB_URI') ||
    msg.includes('DATABASE_URL')
  );
}

export const DB_SETUP_HINT =
  'Database not configured. Add MONGODB_URI and DATABASE_URL to .env.local, then restart the dev server.';

export function degradedSystemHealth() {
  return {
    status: 'DEGRADED' as const,
    core_integrity: 'VERIFY',
    warning: DB_SETUP_HINT,
    metrics: {
      total_memory_packets: 0,
      terminal_failures: 0,
      failed_jobs: 0,
      active_locks: 0,
      stale_locks: 0,
      semantic_fallbacks: 0,
      processing_distribution: [],
      entity_isolation_state: [],
      lock_pressure: 'normal',
      fail_rate: 0,
      sync_density_pct: 0,
      logic_stability_pct: 0,
    },
    integrations: [],
    governance: {
      semantic_enabled: true,
      rag_enabled: true,
      version: 'v1.1.0-hardened-distributed',
    },
    timestamp: new Date().toISOString(),
  };
}

export function degradedMemoryStats() {
  return {
    total_packets: 0,
    embedding_stats: { pending: 0, processing: 0, embedded: 0, failed: 0 },
    source_count: 0,
    recent_ingestion_logs: [],
    warning: DB_SETUP_HINT,
  };
}
