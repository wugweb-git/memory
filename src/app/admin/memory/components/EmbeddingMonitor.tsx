'use client';

import React, { useState, useCallback } from 'react';
import { PieChart, RefreshCw, AlertCircle, CheckCircle2, Clock, MinusCircle } from 'lucide-react';
import { usePolling } from './usePolling';

interface Stats {
  pending: number;
  processing: number;
  embedded: number;
  failed: number;
  /** Waiting for the embedder (shared definition). */
  backlog?: number;
  /** Intentionally skipped: too short, restricted or a permanent failure. */
  not_embeddable?: number;
  total?: number;
}

interface EmbeddingMonitorProps {
  testRunId?: string;
}

export default function EmbeddingMonitor({ testRunId = 'PROD' }: EmbeddingMonitorProps) {
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, embedded: 0, failed: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/memory/stats?test_run_id=${encodeURIComponent(testRunId)}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      const shared = data.memory_stats || {};
      const base = data.embedding_stats || { pending: 0, processing: 0, embedded: 0, failed: 0 };
      setStats({
        ...base,
        backlog: typeof shared.backlog === 'number' ? shared.backlog : undefined,
        not_embeddable: typeof shared.not_embeddable === 'number' ? shared.not_embeddable : undefined,
        total: typeof shared.total === 'number' ? shared.total : undefined,
      });
      setError(null);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? `Could not load embedding stats: ${err.message}. Refresh to retry.` : 'Could not load embedding stats. Refresh to retry.');
    } finally {
      setIsRefreshing(false);
    }
  }, [testRunId]);

  usePolling(fetchStats, 30000);

  const total = stats.total ?? stats.pending + stats.processing + stats.embedded + stats.failed;
  const backlog = stats.backlog ?? stats.pending + stats.processing;
  const percent = Math.round((stats.embedded / (total || 1)) * 100);

  return (
    <section aria-labelledby="embedding-monitor-title" className="bg-bg-elevated rounded-xl border border-border-secondary p-6 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="embedding-monitor-title" className="text-base font-semibold text-text-primary flex items-center gap-2">
            <PieChart aria-hidden="true" className="w-5 h-5 text-accent" />
            Embedding pipeline
          </h2>
          <p className="text-sm text-text-tertiary mt-1">Semantic indexing status. Updates every 30 seconds.</p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={isRefreshing}
          aria-label="Refresh embedding stats"
          className="inline-flex items-center justify-center min-h-11 min-w-11 hover:bg-bg-secondary rounded-full transition-colors disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={`w-4 h-4 text-text-tertiary ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} />
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!loaded && !error ? (
        <p role="status" className="text-sm text-text-tertiary">Loading embedding stats…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatusCard
            label="Backlog"
            count={backlog}
            icon={<Clock aria-hidden="true" className="w-4 h-4 text-warning" />}
            tone="warning"
            subtext="Waiting to be indexed"
          />
          <StatusCard
            label="Embedded"
            count={stats.embedded}
            icon={<CheckCircle2 aria-hidden="true" className="w-4 h-4 text-success" />}
            tone="success"
          />
          <StatusCard
            label="Failed"
            count={stats.failed}
            icon={<AlertCircle aria-hidden="true" className="w-4 h-4 text-danger" />}
            tone="danger"
          />
          {typeof stats.not_embeddable === 'number' && (
            <StatusCard
              label="Not embeddable"
              count={stats.not_embeddable}
              icon={<MinusCircle aria-hidden="true" className="w-4 h-4 text-text-tertiary" />}
              tone="muted"
              subtext="Skipped on purpose"
            />
          )}
        </div>
      )}

      <div className="p-4 bg-bg-secondary rounded-lg border border-border-secondary">
        <div className="flex items-center justify-between text-xs mb-2">
          <span id="embedding-progress-label" className="text-text-tertiary">Memory sync progress</span>
          <span className="text-text-primary font-bold">{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="embedding-progress-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${stats.embedded} of ${total} packets embedded`}
          className="h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="sr-only">{stats.embedded} of {total} packets embedded. {stats.failed} failed.</p>
      </div>
    </section>
  );
}

const TONE: Record<'warning' | 'success' | 'danger' | 'muted', string> = {
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
  muted: 'text-text-tertiary',
};

function StatusCard({ label, count, icon, tone, subtext }: { label: string; count: number; icon: React.ReactNode; tone: 'warning' | 'success' | 'danger' | 'muted'; subtext?: string }) {
  return (
    <div className={`p-4 rounded-lg border bg-bg-secondary border-border-primary ${TONE[tone]} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-text-primary">
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </div>
        <div className="text-xs font-bold text-text-secondary">{label}</div>
        {subtext && <div className="text-xs text-text-tertiary mt-1">{subtext}</div>}
      </div>
    </div>
  );
}
