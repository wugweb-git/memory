/** Scheduled jobs that record an execution_audit_logs row, with owner-facing labels. */
export const TRACKED_JOBS = [
  { eventType: 'jobs:run', label: 'Daily jobs (sources, publishing, persona, cleanup)' },
  { eventType: 'jobs:process-memory', label: 'Memory pipeline' },
] as const;

export type JobLastRun = {
  job: string;
  label: string;
  /** ISO time of the latest run, or null when it has never run. */
  last_run_at: string | null;
  status: 'ok' | 'failed' | 'never';
};

type AuditRow = { eventType: string; status: string | null; createdAt: Date };

/** Pure: picks the newest row per tracked job; a job with no row is honestly 'never'. */
export function summarizeJobRuns(rows: AuditRow[]): JobLastRun[] {
  return TRACKED_JOBS.map(({ eventType, label }) => {
    const latest = rows
      .filter((r) => r.eventType === eventType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!latest) return { job: eventType, label, last_run_at: null, status: 'never' as const };
    return {
      job: eventType,
      label,
      last_run_at: latest.createdAt.toISOString(),
      status: latest.status === 'ok' ? ('ok' as const) : ('failed' as const),
    };
  });
}
