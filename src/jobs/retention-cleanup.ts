import { postgres } from "@/lib/db/postgres";

/**
 * Retention cleanup — deletes rows past their useful life so log/counter
 * tables don't grow unbounded. Deliberately simple (row deletes, not table
 * partitioning): at single-owner scale, partitioning is premature — this is
 * the lightweight version that keeps storage bounded until volume actually
 * warrants it.
 */
export async function runRetentionCleanup() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const [expiredRateLimits, oldSystemLogs, oldAuditLogs, deadQueueItems] = await Promise.all([
    // Rate-limit counters are useless once their window has passed.
    postgres.rateLimitCounter.deleteMany({ where: { resetAt: { lt: new Date(now) } } }),
    // System/audit logs: keep 90 days of operational history.
    postgres.systemLog.deleteMany({ where: { created_at: { lt: new Date(now - 90 * DAY) } } }),
    postgres.executionAuditLog.deleteMany({ where: { createdAt: { lt: new Date(now - 90 * DAY) } } }),
    // Dead-letter publishing queue items: keep 30 days for review, then drop.
    postgres.publishingQueue.deleteMany({ where: { status: "dead", createdAt: { lt: new Date(now - 30 * DAY) } } }),
  ]);

  return {
    ok: true,
    job: "retention-cleanup",
    expiredRateLimits: expiredRateLimits.count,
    oldSystemLogs: oldSystemLogs.count,
    oldAuditLogs: oldAuditLogs.count,
    deadQueueItems: deadQueueItems.count,
  };
}
