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
    return <div className="grid grid-cols-2 gap-4 h-48 bg-bg-secondary animate-pulse rounded-lg border border-border-secondary" />;
  }

  if (!metrics) {
    return (
      <div className="bg-bg-secondary border border-border-secondary border-dashed rounded-xl h-48 flex flex-col items-center justify-center text-text-tertiary text-2xs uppercase font-bold tracking-widest bg-bg-primary/40">
        <BrainCircuit className="w-8 h-8 mb-2 opacity-20" />
        Intelligence synthesis waiting
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-secondary border border-border-secondary rounded-xl overflow-hidden shadow-2xl">
        <div className="py-3 px-4 flex flex-row items-center justify-between border-b border-border-secondary bg-white/[0.02]">
          <h3 className="text-2xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-text-tertiary">
            <BrainCircuit className="w-3.5 h-3.5 text-accent shadow-sm" />
            Intelligence Layer 2
          </h3>
          <div className="px-2 py-0.5 rounded border border-border-primary text-2xs font-bold text-accent bg-bg-secondary uppercase tracking-widest">
            Rule Engine 1.0
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Activity className="w-3 h-3" />
                <span className="text-2xs uppercase font-bold tracking-widest">Signal Volume</span>
              </div>
              <p className="text-2xl font-mono text-text-primary tracking-tighter">{metrics.total_signals}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-text-tertiary">
                <LineChart className="w-3 h-3" />
                <span className="text-2xs uppercase font-bold tracking-widest">Mean Intensity</span>
              </div>
              <p className="text-2xl font-mono text-text-primary tracking-tighter">{metrics.avg_intensity.toFixed(2)}</p>
            </div>
            
            <div className="col-span-2 space-y-4 pt-4 border-t border-border-secondary mt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-2xs uppercase font-bold text-text-tertiary tracking-widest">
                  <span>Work Commitment</span>
                  <span className="text-accent font-mono">{Math.round(metrics.work_load * 100)}%</span>
                </div>
                <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-accent transition-all duration-1000 shadow-sm" 
                    style={{ width: `${metrics.work_load * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-2xs uppercase font-bold text-text-tertiary tracking-widest">
                  <span>Health & Vitality</span>
                  <span className="text-success font-mono">{Math.round(metrics.health_impact * 100)}%</span>
                </div>
                <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-success transition-all duration-1000 shadow-sm" 
                    style={{ width: `${metrics.health_impact * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-bg-secondary border border-border-primary rounded-lg flex items-start gap-3">
        <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
        <p className="text-2xs text-warning leading-relaxed uppercase tracking-tight font-medium ">
          Deterministic extraction enabled. Layer 2 operates without LLM interference for maximum reliability.
        </p>
      </div>
    </div>
  );
}
