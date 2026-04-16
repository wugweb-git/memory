'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, RefreshCw, AlertCircle, CheckCircle2, Clock, PlayCircle } from 'lucide-react';

interface Stats {
  pending: number;
  processing: number;
  embedded: number;
  failed: number;
}

export default function EmbeddingMonitor() {
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, embedded: 0, failed: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      // TODO: Implement /api/memory/stats or similar
      const response = await fetch('/api/memory/stats');
      const data = await response.json();
      setStats(data.embedding_stats || { pending: 0, processing: 0, embedded: 0, failed: 0 });
    } catch (err) {
      console.error('Failed to fetch embedding stats');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            Embedding Pipeline
          </h2>
          <p className="text-sm text-gray-400 mt-1">Real-time semantic indexing status.</p>
        </div>
        <button 
          onClick={fetchStats}
          className={`p-2 hover:bg-white/5 rounded-full transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatusCard 
          label="Backlog" 
          count={stats.pending + stats.processing} 
          icon={<Clock className="w-4 h-4 text-amber-400" />} 
          color="amber"
          subtext="Queueing for worker..."
        />
        <StatusCard 
          label="Token Burn (Est)" 
          count={Math.round(stats.embedded * 250)} 
          icon={<Zap className="w-4 h-4 text-blue-400" />} 
          color="blue"
          subtext="OpenAI text-3-small"
        />
        <StatusCard 
          label="Embedded" 
          count={stats.embedded} 
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} 
          color="emerald"
        />
        <StatusCard 
          label="Failed" 
          count={stats.failed} 
          icon={<AlertCircle className="w-4 h-4 text-red-400" />} 
          color="red"
          action={
            <button className="text-[10px] underline hover:text-red-300 font-bold">
              RETRY ALL
            </button>
          }
        />
      </div>

      <div className="mt-2 p-4 bg-white/5 rounded-lg border border-white/5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-400">Memory Sync Progress</span>
          <span className="text-white font-bold">
            {Math.round((stats.embedded / (stats.pending + stats.processing + stats.embedded + stats.failed || 1)) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(stats.embedded / (stats.pending + stats.processing + stats.embedded + stats.failed || 1)) * 100}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, count, icon, color, action, subtext }: any) {
  const colors: any = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        {icon}
        {action}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </div>
        <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">{label}</div>
        {subtext && <div className="text-[8px] text-gray-500 mt-1 uppercase font-medium">{subtext}</div>}
      </div>
    </div>
  );
}
