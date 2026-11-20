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
    return (
      <div role="status" aria-label="Loading signals" className="h-32 bg-bg-secondary animate-pulse motion-reduce:animate-none rounded-lg border border-border-secondary" />
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center border border-dashed border-border-secondary rounded-lg text-text-tertiary bg-bg-primary px-4 text-center">
        <HelpCircle aria-hidden="true" className="w-6 h-6 mb-2 opacity-40" />
        <p className="text-sm">No signals interpreted yet.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="signal-timeline-title" className="bg-bg-secondary border border-border-secondary rounded-xl overflow-hidden">
      <div className="py-3 px-4 border-b border-border-secondary">
        <h4 id="signal-timeline-title" className="text-sm font-semibold flex items-center gap-2 text-text-secondary">
          <Zap aria-hidden="true" className="w-4 h-4 text-warning" />
          Signal pulse
        </h4>
      </div>
      <ul
        tabIndex={0}
        aria-label="Interpreted signals, newest first"
        className="divide-y divide-border-secondary max-h-[300px] overflow-y-auto"
      >
        {signals.map((signal) => {
          const relative = (signal.intensity_absolute / 5 * 10).toFixed(1);
          const conf = Math.round(signal.confidence * 100);
          return (
            <li key={signal.id} className="p-3 hover:bg-bg-tertiary transition-colors flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-full bg-bg-tertiary ${
                  signal.type === 'work_activity' || signal.type === 'learning' ? 'text-accent-ink' : 'text-text-tertiary'
                }`}>
                  <Activity aria-hidden="true" className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary break-words">{signal.category}</p>
                  <p className="text-xs text-text-tertiary font-mono break-words">{signal.type}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <TrendingUp aria-hidden="true" className="w-3 h-3 text-success" />
                    <span className="text-xs font-mono text-success">{relative}</span>
                  </div>
                  <p className="text-xs text-text-tertiary">Relative intensity</p>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-bg-secondary border border-border-secondary text-xs text-text-tertiary font-semibold">
                  {conf}% confidence
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
