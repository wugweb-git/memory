'use client';

import React from 'react';
import { Activity, Zap, TrendingUp, HelpCircle } from 'lucide-react';

interface Signal {
  id: string;
  type: string;
  category: string;
  intensity_absolute: number;
  confidence: number;
  timestamp: string;
}

interface SignalTimelineProps {
  signals: Signal[];
  loading?: boolean;
}

export function SignalTimeline({ signals, loading }: SignalTimelineProps) {
  if (loading) {
    return <div className="h-32 bg-slate-900/50 animate-pulse rounded-lg border border-slate-800" />;
  }

  if (!signals || signals.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500 bg-black/40">
        <HelpCircle className="w-6 h-6 mb-2 opacity-20" />
        <p className="text-[10px] uppercase tracking-widest">No signals interpreted</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="py-3 px-4 border-b border-slate-800/50 bg-white/[0.02]">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-slate-400">
          <Zap className="w-3 h-3 text-amber-400" />
          Signal Pulse
        </h3>
      </div>
      <div className="divide-y divide-slate-800/50 max-h-[300px] overflow-y-auto">
        {signals.map((signal) => (
          <div key={signal.id} className="p-3 hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full bg-slate-800 ${
                signal.type === 'work_activity' ? 'text-blue-400' :
                signal.type === 'learning' ? 'text-purple-400' : 'text-slate-400'
              }`}>
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200 uppercase tracking-tight">{signal.category}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-tighter font-mono">{signal.type}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <TrendingUp className="w-3 h-3 text-emerald-500 opacity-50" />
                  <span className="text-xs font-mono text-emerald-400">{(signal.intensity_absolute / 5 * 10).toFixed(1)}</span>
                </div>
                <p className="text-[8px] text-slate-600 uppercase font-bold">Rel. Intensity</p>
              </div>
              
              <div className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[8px] text-slate-400 font-bold tracking-widest uppercase">
                {Math.round(signal.confidence * 100)}% Conf
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
