'use client';

import React from 'react';
import { BrainCircuit, Activity, LineChart, ShieldAlert } from 'lucide-react';

interface IntelMetrics {
  total_signals: number;
  avg_intensity: number;
  health_impact: number;
  work_load: number;
}

interface IntelPanelProps {
  metrics: IntelMetrics | null;
  loading?: boolean;
}

export function IntelPanel({ metrics, loading }: IntelPanelProps) {
  if (loading) {
    return <div className="grid grid-cols-2 gap-4 h-48 bg-slate-900/50 animate-pulse rounded-lg border border-slate-800" />;
  }

  if (!metrics) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl h-48 flex flex-col items-center justify-center text-slate-500 text-[10px] uppercase font-bold tracking-widest bg-black/40">
        <BrainCircuit className="w-8 h-8 mb-2 opacity-20" />
        Intelligence synthesis waiting
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800/50 bg-white/[0.02]">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-slate-400">
            <BrainCircuit className="w-3.5 h-3.5 text-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
            Intelligence Layer 2
          </h3>
          <div className="px-2 py-0.5 rounded border border-blue-500/30 text-[9px] font-bold text-blue-400 bg-blue-500/5 uppercase tracking-widest">
            Rule Engine 1.0
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500">
                <Activity className="w-3 h-3" />
                <span className="text-[9px] uppercase font-bold tracking-widest">Signal Volume</span>
              </div>
              <p className="text-2xl font-mono text-slate-100 tracking-tighter">{metrics.total_signals}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500">
                <LineChart className="w-3 h-3" />
                <span className="text-[9px] uppercase font-bold tracking-widest">Mean Intensity</span>
              </div>
              <p className="text-2xl font-mono text-slate-100 tracking-tighter">{metrics.avg_intensity.toFixed(2)}</p>
            </div>
            
            <div className="col-span-2 space-y-4 pt-4 border-t border-slate-800/50 mt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-500 tracking-widest">
                  <span>Work Commitment</span>
                  <span className="text-blue-400 font-mono">{Math.round(metrics.work_load * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    style={{ width: `${metrics.work_load * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-500 tracking-widest">
                  <span>Health & Vitality</span>
                  <span className="text-emerald-400 font-mono">{Math.round(metrics.health_impact * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    style={{ width: `${metrics.health_impact * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-3">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[9px] text-amber-200/50 leading-relaxed uppercase tracking-tight font-medium italic">
          Deterministic extraction enabled. Layer 2 operates without LLM interference for maximum reliability.
        </p>
      </div>
    </div>
  );
}
