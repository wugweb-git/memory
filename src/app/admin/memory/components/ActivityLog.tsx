'use client';

import React, { useEffect, useState } from 'react';
import { Terminal, Shield } from 'lucide-react';

interface LogEntry {
  id: string;
  time: string;
  event: string;
  level: 'info' | 'warn' | 'error';
  target?: string;
}

interface ActivityLogProps {
  testRunId?: string;
}

export default function ActivityLog({ testRunId = 'PROD' }: ActivityLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const events = [
        "Scheduler sweep started",
        "L2 Signal Extraction complete",
        "L2.5 Semantic Enrichment triggered",
        "Adaptive Retry: Packet [x4a] re-queued (Transient)",
        "SystemSettings cache refreshed",
        "Reconciliation: Unverified entity upgraded",
        "Embedding Worker: 5 packets processed"
      ];
      const levels: Array<'info' | 'warn' | 'error'> = ['info', 'info', 'info', 'warn', 'info', 'info', 'info'];
      const index = Math.floor(Math.random() * events.length);
      
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString(),
        event: events[index],
        level: levels[index],
        target: 'scheduler'
      };

      setLogs(prev => [newLog, ...prev].slice(0, 50));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black border border-white/10 rounded-xl overflow-hidden h-[450px] flex flex-col shadow-2xl">
      <div className="py-4 px-6 border-b border-white/5 flex flex-row items-center justify-between shrink-0 bg-white/[0.02]">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400">
          <Terminal className="w-3.5 h-3.5" />
          Governance Activity Log
        </h3>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded border border-emerald-500/30 text-[9px] font-bold text-emerald-400 bg-emerald-500/5 uppercase tracking-widest flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Monitor
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 text-[10px] uppercase font-bold tracking-widest py-20 opacity-30">
            <Shield className="w-8 h-8 mb-2" />
            Waiting for system telemetry
          </div>
        ) : logs.map((log) => (
          <div key={log.id} className="flex gap-4 group">
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${
                log.level === 'error' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 
                log.level === 'warn' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]'
              }`} />
              <div className="w-px h-full bg-white/5 my-1" />
            </div>
            <div className="flex-1 min-w-0 pb-3 border-b border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono ${
                  log.level === 'error' ? 'text-red-400' : 
                  log.level === 'warn' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  [{log.time}]
                </span>
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                  sys::{log.target}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed group-hover:text-white transition-colors font-medium">
                {log.event}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
