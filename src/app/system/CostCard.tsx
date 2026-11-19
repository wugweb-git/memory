'use client';

import { useEffect, useState } from 'react';
import { M3Card, M3State } from '@/components/ui/m3';
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

  useEffect(() => {
    apiRequest<CostResponse>(API_ENDPOINTS.system.cost.path, { retries: 0 })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Check your connection and reload'));
  }, []);

  return (
    <M3Card title="Model request budget">
      {data === null ? (
        error ? (
          <M3State state="error" message={`Usage could not load (${error}). Reload the page, or sign in as the owner.`} />
        ) : (
          <div className="space-y-2" role="status" aria-label="Loading request budget">
            <Skeleton className="h-12 w-full motion-reduce:animate-none" />
            <Skeleton className="h-12 w-full motion-reduce:animate-none" />
          </div>
        )
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            {data.used} of {data.cap} free requests used today (UTC {data.date}). Background jobs cannot use the share kept for Ask and Decision.
          </p>
          <ul className="mt-2 divide-y divide-border-secondary">
            {data.budgets.map((b) => (
              <li key={b.job} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{JOB_LABELS[b.job] ?? b.job}</p>
                  <p className="text-xs text-text-tertiary">
                    {b.kind === 'interactive' ? 'Interactive' : 'Background'}
                    {b.allowed ? '' : b.blockedReason === 'job_limit' ? ': daily limit reached' : ': paused to protect Ask and Decision'}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-text-primary" aria-label={`${b.used} of ${b.limit} requests used`}>
                  {b.used} / {b.limit}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-2xs text-text-tertiary mt-2">Limits reset at 00:00 UTC. Change them with the DAILY_BUDGET_ASK, _DECISION, _SIGNALS, _SUMMARY and _INGEST environment variables.</p>
        </>
      )}
    </M3Card>
  );
}
