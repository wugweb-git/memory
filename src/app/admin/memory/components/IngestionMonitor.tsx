'use client';

import React, { useState, useEffect } from 'react';
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

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/memory/stats?test_run_id=${testRunId}`);
      const data = await response.json();
      setLogs(data.recent_ingestion_logs || []);
    } catch (err) {
      console.error('Failed to fetch ingestion logs');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Ingestion Gate Monitor
          </h2>
          <p className="text-sm text-gray-400 mt-1">Live decision stream from the memory gate.</p>
        </div>
        <div className={`w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] ${isRefreshing ? 'animate-pulse' : ''}`} />
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group flex items-center gap-4 bg-white/5 hover:bg-white/[0.08] transition-all p-3 rounded-lg border border-white/5"
            >
              <div className={`p-2 rounded-md ${
                log.decision === 'ACCEPT' ? 'bg-emerald-500/10 text-emerald-400' :
                log.decision === 'REJECT' ? 'bg-red-500/10 text-red-400' :
                'bg-amber-500/10 text-amber-400'
              }`}>
                {log.decision === 'ACCEPT' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide uppercase">{log.decision}</span>
                  <span className="text-[10px] text-gray-500">•</span>
                  <span className="text-[10px] text-gray-400 font-mono translate-y-[1px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-gray-300 truncate mt-0.5">
                  {log.reason}
                </div>
              </div>

              <div className="text-right flex items-center gap-3">
                <div className="hidden group-hover:block transition-all">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
                <div className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono text-gray-500 uppercase">
                  {log.source || 'system'}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button className="w-full mt-6 py-2 rounded-lg border border-white/5 text-[10px] font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all tracking-widest uppercase">
        View Full Audit Log
      </button>
    </div>
  );
}
