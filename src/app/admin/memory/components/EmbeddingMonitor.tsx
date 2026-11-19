'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PieChart, RefreshCw, AlertCircle, CheckCircle2, Clock, PlayCircle, Zap } from 'lucide-react';

interface Stats {
  pending: number;
  processing: number;
  embedded: number;
  failed: number;
}

interface EmbeddingMonitorProps {
  testRunId?: string;
}

export default function EmbeddingMonitor({ testRunId = 'PROD' }: EmbeddingMonitorProps) {
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, embedded: 0, failed: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/memory/stats?test_run_id=${encodeURIComponent(testRunId)}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setStats(data.embedding_stats || { pending: 0, processing: 0, embedded: 0, failed: 0 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch embedding stats');
    } finally {
      setIsRefreshing(false);
    }
  }, [testRunId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="bg-bg-elevated rounded-xl border border-border-secondary p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <PieChart className="w-5 h-5 text-accent" />
            Embedding Pipeline
          </h2>
          <p className="text-sm text-text-tertiary mt-1">Real-time semantic indexing status.</p>
        </div>
        <button 
          onClick={fetchStats}
          aria-label="Refresh embedding stats"
          className={`p-2 hover:bg-bg-secondary rounded-full transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-4 h-4 text-text-tertiary" />
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <StatusCard 
          label="Backlog" 
          count={stats.pending + stats.processing} 
          icon={<Clock className="w-4 h-4 text-warning" />} 
          color="amber"
          subtext="Waiting for the pipeline"
        />
        <StatusCard 
          label="Embedded" 
          count={stats.embedded} 
          icon={<CheckCircle2 className="w-4 h-4 text-success" />} 
          color="emerald"
        />
        <StatusCard 
          label="Failed" 
          count={stats.failed} 
          icon={<AlertCircle className="w-4 h-4 text-danger" />} 
          color="red"
        />
      </div>

      <div className="mt-2 p-4 bg-bg-secondary rounded-lg border border-border-secondary">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-text-tertiary">Memory Sync Progress</span>
          <span className="text-text-primary font-bold">
            {Math.round((stats.embedded / (stats.pending + stats.processing + stats.embedded + stats.failed || 1)) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(stats.embedded / (stats.pending + stats.processing + stats.embedded + stats.failed || 1)) * 100}%` }}
            className="h-full bg-accent"
          />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, count, icon, color, action, subtext }: any) {
  const colors: any = {
    amber: 'bg-bg-secondary border-border-primary text-warning',
    blue: 'bg-bg-secondary border-border-primary text-accent',
    emerald: 'bg-bg-secondary border-border-primary text-success',
    red: 'bg-bg-secondary border-border-primary text-danger',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        {icon}
        {action}
      </div>
      <div>
        <div className="text-2xl font-bold text-text-primary">
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </div>
        <div className="text-2xs uppercase font-bold tracking-widest opacity-60">{label}</div>
        {subtext && <div className="text-2xs text-text-tertiary mt-1 uppercase font-medium">{subtext}</div>}
      </div>
    </div>
  );
}
