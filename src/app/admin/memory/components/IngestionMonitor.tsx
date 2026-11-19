'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, ShieldAlert, Zap, Clock, ChevronRight } from 'lucide-react';

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

export default function IngestionMonitor({ testRunId = 'PROD' }: IngestionMonitorProps) {
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/memory/stats?test_run_id=${encodeURIComponent(testRunId)}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setLogs(data.recent_ingestion_logs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ingestion logs');
    } finally {
      setIsRefreshing(false);
    }
  }, [testRunId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="bg-bg-elevated rounded-xl border border-border-secondary p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-success" />
            Ingestion Gate Monitor
          </h2>
          <p className="text-sm text-text-tertiary mt-1">Live decision stream from the memory gate.</p>
        </div>
        <div className={`w-2 h-2 rounded-full bg-success shadow-sm ${isRefreshing ? 'animate-pulse' : ''}`} />
      </div>

      {error && <p role="alert" className="text-sm text-danger mb-3">{error}</p>}
      {!error && logs.length === 0 && <p className="text-sm text-text-tertiary">No ingestion decisions yet.</p>}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group flex items-center gap-4 bg-bg-secondary hover:bg-bg-tertiary transition-all p-3 rounded-lg border border-border-secondary"
            >
              <div className={`p-2 rounded-md ${
                log.decision === 'ACCEPT' ? 'bg-bg-secondary text-success' :
                log.decision === 'REJECT' ? 'bg-bg-secondary text-danger' :
                'bg-bg-secondary text-warning'
              }`}>
                {log.decision === 'ACCEPT' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary tracking-wide uppercase">{log.decision}</span>
                  <span className="text-2xs text-text-tertiary">•</span>
                  <span className="text-2xs text-text-tertiary font-mono translate-y-[1px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-text-secondary truncate mt-0.5">
                  {log.reason}
                </div>
              </div>

              <div className="text-right flex items-center gap-3">
                <div className="hidden group-hover:block transition-all">
                  <ChevronRight className="w-4 h-4 text-text-tertiary" />
                </div>
                <div className="px-2 py-0.5 rounded bg-bg-primary/40 text-2xs font-mono text-text-tertiary uppercase">
                  {log.source || 'system'}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
