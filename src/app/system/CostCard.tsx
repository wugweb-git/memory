'use client';

import { useCallback, useEffect, useState } from 'react';
import { M3State } from '@/components/ui/m3';
import { ListRow, ListSection, RowList } from '@/app/integrations/list-parts';
import { Skeleton } from '@/components/ui/primitives';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { apiRequest } from '@/lib/ui/api-client';

interface Budget {
  job: string;
  kind: 'interactive' | 'background';
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
  blockedReason: string | null;
}
interface CostResponse { date: string; cap: number; used: number; remaining: number; budgets: Budget[] }

const JOB_LABELS: Record<string, string> = {
  ask: 'Ask',
  decision: 'Decision',
  signals: 'Signals',
  summary: 'Summary',
  ingest: 'Ingest',
};

/** Read-only: today's model requests against each job's daily budget. */
export function CostCard() {
  const [data, setData] = useState<CostResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    apiRequest<CostResponse>(API_ENDPOINTS.system.cost.path, { retries: 0 })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Check your connection'));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ListSection
      id="cost-title"
      title="Model request budget"
      hint={data ? `${data.used} of ${data.cap} free requests used today (UTC ${data.date}). Background jobs cannot use the share kept for Ask and Decision.` : undefined}
      bare
    >
      {data === null ? (
        error ? (
          <div className="space-y-2 p-4">
            <M3State state="error" message={`Usage could not load (${error}). Try again, or sign in as the owner.`} />
            <button
              type="button"
              onClick={load}
              className="inline-flex min-h-11 items-center rounded-xl border border-border-primary px-4 text-sm font-semibold text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-4" role="status" aria-label="Loading request budget">
            <Skeleton className="h-12 w-full motion-reduce:animate-none" />
            <Skeleton className="h-12 w-full motion-reduce:animate-none" />
          </div>
        )
      ) : (
        <>
          <RowList label="Requests used per job">
            {data.budgets.map((b) => (
              <ListRow
                key={b.job}
                title={JOB_LABELS[b.job] ?? b.job}
                supporting={`${b.kind === 'interactive' ? 'Interactive' : 'Background'}${b.allowed ? '' : b.blockedReason === 'job_limit' ? ': daily limit reached' : ': paused to protect Ask and Decision'}`}
                trailing={
                  <p className="text-base font-medium tabular-nums text-text-primary" aria-label={`${b.used} of ${b.limit} requests used`}>
                    {b.used} / {b.limit}
                  </p>
                }
              />
            ))}
          </RowList>
          <p className="border-t border-border-secondary px-4 py-3 text-xs text-text-tertiary">Limits reset at 00:00 UTC. Change them with the DAILY_BUDGET_ASK, _DECISION, _SIGNALS, _SUMMARY and _INGEST environment variables.</p>
        </>
      )}
    </ListSection>
  );
}
