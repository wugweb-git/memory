'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Activity, ShieldCheck, ShieldAlert } from 'lucide-react';
import { usePolling } from './usePolling';

interface IngestionLog {
  id: string;
  decision: 'ACCEPT' | 'HOLD' | 'REDIRECT' | 'REJECT';
  reason: string;
  timestamp: string;
  source: string;
}

interface IngestionMonitorProps {
  testRunId?: string;
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? 'unknown time' : d.toLocaleTimeString();
}

export default function IngestionMonitor({ testRunId = 'PROD' }: IngestionMonitorProps) {
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/memory/stats?test_run_id=${encodeURIComponent(testRunId)}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setLogs(data.recent_ingestion_logs || []);
      setError(null);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? `Could not load ingestion decisions: ${err.message}. It will retry automatically.` : 'Could not load ingestion decisions. It will retry automatically.');
    } finally {
      setIsRefreshing(false);
    }
  }, [testRunId]);

  usePolling(fetchLogs, 10000);

  return (
    <section aria-labelledby="ingestion-monitor-title" className="bg-bg-elevated rounded-xl border border-border-secondary p-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 id="ingestion-monitor-title" className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Activity aria-hidden="true" className="w-5 h-5 text-success" />
            Ingestion gate monitor
          </h2>
          <p className="text-sm text-text-tertiary mt-1">Recent accept and hold decisions. Updates every 10 seconds.</p>
        </div>
        <span
          role="status"
          className={`inline-flex items-center gap-1.5 text-xs text-text-tertiary shrink-0 pt-1`}
        >
          <span aria-hidden="true" className={`w-2 h-2 rounded-full ${error ? 'bg-danger' : 'bg-success'} ${isRefreshing ? 'animate-pulse motion-reduce:animate-none' : ''}`} />
          {error ? 'Offline' : isRefreshing ? 'Updating' : 'Live'}
        </span>
      </div>

      {error && <p role="alert" className="text-sm text-danger mb-3">{error}</p>}
      {!error && !loaded && <p role="status" className="text-sm text-text-tertiary">Loading decisions…</p>}
      {!error && loaded && logs.length === 0 && <p className="text-sm text-text-tertiary">No ingestion decisions yet. They appear here after the first capture.</p>}
      <ul className="space-y-3">
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.li
              key={log.id}
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              className="flex items-center gap-4 bg-bg-secondary hover:bg-bg-tertiary transition-colors p-3 rounded-lg border border-border-secondary"
            >
              <div className={`p-2 rounded-md ${
                log.decision === 'ACCEPT' ? 'text-success' :
                log.decision === 'REJECT' ? 'text-danger' :
                'text-warning'
              }`}>
                {log.decision === 'ACCEPT' ? <ShieldCheck aria-hidden="true" className="w-4 h-4" /> : <ShieldAlert aria-hidden="true" className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary">{log.decision}</span>
                  <span aria-hidden="true" className="text-xs text-text-tertiary">·</span>
                  <time dateTime={log.timestamp} className="text-xs text-text-tertiary font-mono">
                    {formatTime(log.timestamp)}
                  </time>
                </div>
                <div className="text-sm text-text-secondary truncate mt-0.5" title={log.reason}>
                  {log.reason}
                </div>
              </div>

              <div className="px-2 py-0.5 rounded bg-bg-primary text-xs font-mono text-text-tertiary shrink-0 max-w-[40%] truncate">
                {log.source || 'system'}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
