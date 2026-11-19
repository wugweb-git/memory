'use client';

import React from 'react';
import { BrainCircuit, Activity, LineChart, ShieldAlert } from 'lucide-react';

interface IntelMetrics {
  total_signals: number;
  avg_intensity: number;
  health_impact?: number | null;
  work_load?: number | null;
}

interface IntelPanelProps {
  metrics: IntelMetrics | null;
  loading?: boolean;
}

function toPercent(value: number) {
  const n = Number.isFinite(value) ? value * 100 : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function Meter({ id, label, percent, tone }: { id: string; label: string; percent: number; tone: 'accent' | 'success' }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
        <span id={id}>{label}</span>
        <span className={`font-mono ${tone === 'accent' ? 'text-accent' : 'text-success'}`}>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden"
      >
        <div
          className={`h-full transition-[width] duration-500 motion-reduce:transition-none ${tone === 'accent' ? 'bg-accent' : 'bg-success'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function IntelPanel({ metrics, loading }: IntelPanelProps) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading intelligence metrics" className="h-48 bg-bg-secondary animate-pulse motion-reduce:animate-none rounded-xl border border-border-secondary" />
    );
  }

  if (!metrics) {
    return (
      <div className="border border-border-secondary border-dashed rounded-xl h-48 flex flex-col items-center justify-center text-text-tertiary text-sm bg-bg-primary px-6 text-center">
        <BrainCircuit aria-hidden="true" className="w-8 h-8 mb-2 opacity-40" />
        <p>No intelligence metrics yet. They appear once signals have been processed.</p>
      </div>
    );
  }

  const hasWork = typeof metrics.work_load === 'number';
  const hasHealth = typeof metrics.health_impact === 'number';
  const workPercent = toPercent(metrics.work_load ?? 0);
  const healthPercent = toPercent(metrics.health_impact ?? 0);

  return (
    <div className="space-y-4">
      <section aria-labelledby="intel-panel-title" className="bg-bg-secondary border border-border-secondary rounded-xl overflow-hidden">
        <div className="py-3 px-4 flex flex-row items-center justify-between gap-3 border-b border-border-secondary">
          <h4 id="intel-panel-title" className="text-sm font-semibold flex items-center gap-2 text-text-secondary">
            <BrainCircuit aria-hidden="true" className="w-4 h-4 text-accent" />
            Intelligence layer 2
          </h4>
          <span className="px-2 py-0.5 rounded border border-border-primary text-2xs font-bold text-accent bg-bg-secondary">
            Rule engine 1.0
          </span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Activity aria-hidden="true" className="w-3 h-3" />
                <span className="text-xs font-semibold">Signal volume</span>
              </div>
              <p className="text-2xl font-mono text-text-primary tracking-tight">{metrics.total_signals}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-text-tertiary">
                <LineChart aria-hidden="true" className="w-3 h-3" />
                <span className="text-xs font-semibold">Mean intensity</span>
              </div>
              <p className="text-2xl font-mono text-text-primary tracking-tight">{Number(metrics.avg_intensity ?? 0).toFixed(2)}</p>
            </div>

            <div className="col-span-2 space-y-4 pt-4 border-t border-border-secondary mt-2">
              {hasWork && <Meter id="intel-work-label" label="Work commitment" percent={workPercent} tone="accent" />}
              {hasHealth && <Meter id="intel-health-label" label="Health and vitality" percent={healthPercent} tone="success" />}
              {!hasWork && !hasHealth && (
                <p className="text-xs text-text-tertiary">Work and health scores are not calculated for a single packet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="p-3 bg-bg-secondary border border-border-primary rounded-lg flex items-start gap-3">
        <ShieldAlert aria-hidden="true" className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Deterministic extraction is on. Layer 2 runs without an LLM so results are repeatable.
        </p>
      </div>
    </div>
  );
}
