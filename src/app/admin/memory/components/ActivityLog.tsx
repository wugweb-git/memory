'use client';

import React, { useCallback, useState } from 'react';
import { usePolling } from './usePolling';
import { Terminal, Shield } from 'lucide-react';

interface LogEntry {
  id: string;
  time: string;
  event: string;
  level: 'info' | 'warn' | 'error';
  target: string;
}

interface ActivityLogProps {
  testRunId?: string;
}

type RawLog = { id: string; decision?: string; reason?: string; timestamp?: string; source?: string };

function toEntry(l: RawLog): LogEntry {
  const d = String(l.decision ?? '').toUpperCase();
  const t = l.timestamp ? new Date(l.timestamp) : null;
  return {
    id: l.id,
    time: t && !Number.isNaN(t.getTime()) ? t.toLocaleTimeString() : 'unknown',
    event: `${d || 'EVENT'}${l.reason ? `: ${l.reason}` : ''}`,
    level: d === 'REJECT' ? 'error' : d === 'ACCEPT' ? 'info' : 'warn',
    target: l.source || 'ingestion',
  };
}

/** Real ingestion-gate decisions from /api/memory/stats (no simulated telemetry). */
export default function ActivityLog({ testRunId = 'PROD' }: ActivityLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/memory/stats?test_run_id=${encodeURIComponent(testRunId)}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setLogs(((data.recent_ingestion_logs ?? []) as RawLog[]).map(toEntry));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? `Could not load activity: ${e.message}. It will retry automatically.` : 'Could not load activity. It will retry automatically.');
    } finally {
      setLoading(false);
    }
  }, [testRunId]);

  usePolling(load, 15000);

  return (
    <section aria-labelledby="activity-log-title" className="bg-bg-primary border border-border-secondary rounded-xl overflow-hidden h-[450px] flex flex-col">
      <div className="py-4 px-6 border-b border-border-secondary flex flex-row items-center justify-between shrink-0 bg-bg-secondary">
        <h2 id="activity-log-title" className="text-base font-semibold flex items-center gap-2 text-text-primary">
          <Terminal aria-hidden="true" className="w-5 h-5 text-text-tertiary" />
          Recent gate activity
        </h2>
      </div>
      <div tabIndex={0} role="region" aria-label="Recent gate activity entries" className="flex-1 overflow-y-auto p-4 space-y-3">
        {error ? (
          <p role="alert" className="text-sm text-danger">{error}</p>
        ) : loading ? (
          <p role="status" className="text-sm text-text-tertiary">Loading activity…</p>
        ) : logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-tertiary text-sm py-20">
            <Shield aria-hidden="true" className="w-8 h-8 mb-2 opacity-40" />
            No recent activity yet.
          </div>
        ) : logs.map((log) => (
          <div key={log.id} className="flex gap-4 group">
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${log.level === 'error' ? 'bg-danger' : log.level === 'warn' ? 'bg-warning' : 'bg-accent'}`} />
              <div aria-hidden="true" className="w-px h-full bg-bg-tertiary my-1" />
            </div>
            <div className="flex-1 min-w-0 pb-3 border-b border-border-secondary">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono ${log.level === 'error' ? 'text-danger' : log.level === 'warn' ? 'text-warning' : 'text-accent-ink'}`}>
                  [{log.time}]
                </span>
                <span className="text-xs text-text-tertiary font-semibold truncate ml-2">{log.target}</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed break-words">
                <span className="sr-only">{log.level === 'error' ? 'Rejected. ' : log.level === 'warn' ? 'Held or redirected. ' : 'Accepted. '}</span>{log.event}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
