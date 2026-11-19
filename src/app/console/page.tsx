"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database, ShieldCheck, Archive, Zap, Brain, Cpu,
  ChevronRight, LayoutDashboard, FileText, Sparkles,
} from 'lucide-react';
import { AppShell } from '@/app/component/AppShell';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import { UI_API } from '@/lib/api/endpoints';

/* ── Error boundary ───────────────────────────────────────────── */
class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel rounded-radius-xl border border-danger/20 p-6 text-center">
          <p role="alert" className="text-sm text-danger font-bold">Dashboard failed to load. Refresh the page to try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Primitives ───────────────────────────────────────────────── */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-2xs font-black text-text-tertiary uppercase tracking-widest mb-3 px-1">{children}</h2>
);

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; icon: React.ReactNode }> =
({ label, value, sub, color = 'text-text-primary', icon }) => (
  <div className="glass-panel rounded-radius-xl p-4 md:p-6 border border-border-secondary flex items-start justify-between gap-2">
    <div className="min-w-0">
      <p className="text-2xs font-black text-text-tertiary uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tight break-words ${color}`}>{value}</p>
      {sub && <p className="text-2xs text-text-tertiary mt-1 font-bold">{sub}</p>}
    </div>
    <div aria-hidden="true" className="w-10 h-10 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center shrink-0">
      {icon}
    </div>
  </div>
);

const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-28' }) => (
  <div aria-hidden="true" className={`glass-panel rounded-radius-xl border border-border-secondary p-6 animate-pulse motion-reduce:animate-none ${className}`}>
    <div className="h-3 w-1/3 bg-secondary rounded mb-3" />
    <div className="h-8 w-1/2 bg-secondary rounded" />
  </div>
);

/* ── Console ──────────────────────────────────────────────────── */
const QUICK = [
  { href: '/ask',       label: 'Ask your memory', icon: Brain,    desc: 'Ask anything grounded in your memory' },
  { href: '/memory',    label: 'Memory vault',           icon: Database,  desc: 'Indexed knowledge packets' },
  { href: '/buffer',    label: 'Buffer queue',           icon: Archive,   desc: 'Pending intake for review' },
  { href: '/cognitive', label: 'Decision engine',        icon: Cpu,       desc: 'Architect, founder and operator modes' },
  { href: '/persona',   label: 'Persona',                icon: Sparkles,  desc: 'Behavioral & style intelligence' },
  { href: '/content',   label: 'Content',                icon: FileText,  desc: 'Generated & published output' },
] as const;

type LayerStatus = 'Active' | 'Degraded' | 'Offline' | 'Checking';

const LAYER_DEFS = [
  { id: 'L0', name: 'Intake' },
  { id: 'L1', name: 'Memory' },
  { id: 'L2', name: 'Processing' },
  { id: 'L3', name: 'Cognitive' },
  { id: 'L4', name: 'Persona' },
  { id: 'L5', name: 'Output' },
] as const;

const STATUS_BADGE: Record<LayerStatus, string> = {
  Active:   'bg-success/10 text-success border-success/20',
  Degraded: 'bg-warning/10 text-warning border-warning/20',
  Offline:  'bg-danger/10 text-danger border-danger/20',
  Checking: 'bg-secondary text-text-tertiary border-border-secondary',
};

/** Real per-layer health, probed from the layers' own APIs — no pretend statuses. */
function useLayerHealth(): Record<string, LayerStatus> {
  const [layers, setLayers] = useState<Record<string, LayerStatus>>(
    Object.fromEntries(LAYER_DEFS.map((l) => [l.id, 'Checking'])),
  );

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      // L0–L2 live in the ingestion store; one health call covers them.
      const ingestionLayers = fetch('/api/health/system')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((h) => {
          const s: LayerStatus =
            h.status === 'LOCKED' ? 'Active' : h.status === 'DEGRADED' ? 'Degraded' : 'Offline';
          // A degraded response with 0 packets usually means the DB is unreachable.
          return h.warning ? 'Offline' : s;
        })
        .catch((): LayerStatus => 'Offline');

      const ping = (url: string) =>
        fetch(url).then((r): LayerStatus => (r.ok ? 'Active' : 'Offline')).catch((): LayerStatus => 'Offline');

      const [ingestion, l3, l4, l5] = await Promise.all([
        ingestionLayers,
        ping('/api/cognitive/history'),
        ping('/api/persona/profile'),
        ping('/api/output/history'),
      ]);

      if (!cancelled) {
        setLayers({ L0: ingestion, L1: ingestion, L2: ingestion, L3: l3, L4: l4, L5: l5 });
      }
    }

    probe();
    return () => { cancelled = true; };
  }, []);

  return layers;
}

type Recommendation = {
  id: string;
  title: string;
  reason: string;
  href: string;
  urgent: boolean;
};

/** Next-best-actions from the recommendation engine (live system state). */
function useRecommendations() {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(UI_API.recommendations)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { if (!cancelled) setRecs(Array.isArray(j.recommendations) ? j.recommendations : []); })
      .catch(() => { if (!cancelled) { setFailed(true); setRecs([]); } });
    return () => { cancelled = true; };
  }, []);
  return { recs, failed };
}

export default function ConsolePage() {
  const { stats, loading } = useDashboardData();
  const layerHealth = useLayerHealth();
  const { recs: recommendations, failed: recsFailed } = useRecommendations();
  const syncKey = String(stats.syncStatus).toLowerCase();
  const syncUnknown = syncKey === 'unknown' || syncKey === '—';
  const syncBad = syncKey === 'degraded' || syncKey === 'offline';
  const syncColor = syncUnknown ? 'text-text-tertiary' : syncBad ? 'text-warning' : 'text-success';
  const syncSub = syncUnknown ? 'Health check unavailable' : syncBad ? 'Some layers need attention' : 'All layers nominal';

  return (
    <AppShell>
      <header className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
          <LayoutDashboard size={20} className="text-text-tertiary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">Console</h1>
          <p className="text-sm text-text-tertiary font-medium">Identity Prism at a glance</p>
        </div>
      </header>

      <SectionErrorBoundary>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" aria-busy={loading}>
          {loading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} />)
          ) : (
            <>
              <StatCard label="Memory packets" value={String(stats.memoryPackets)} sub="Total indexed" icon={<Database size={18} className="text-accent" />} />
              <StatCard label="Sync status" value={String(stats.syncStatus)} sub={syncSub} color={syncColor} icon={<ShieldCheck size={18} className={syncColor} />} />
              <StatCard label="Buffer queue" value={String(stats.bufferQueue)} sub="Pending review" icon={<Archive size={18} className="text-warning" />} />
              <StatCard label="Uplink" value={String(stats.uplink)} sub="Reasoning layer reliability" icon={<Zap size={18} className="text-accent" />} />
            </>
          )}
        </div>

        {/* Next best actions — the "act" surface (recommendation engine) */}
        <div className="mb-8">
          <Label>Next best actions</Label>
          {recommendations === null ? (
            <Skeleton className="h-20" />
          ) : recsFailed ? (
            <div role="alert" className="glass-panel rounded-radius-xl border border-danger/20 p-5 flex items-center gap-3">
              <p className="text-sm text-danger">Could not load recommendations. Refresh the page to try again.</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="glass-panel rounded-radius-xl border border-border-secondary p-5 flex items-center gap-3">
              <ShieldCheck size={18} className="text-success shrink-0" aria-hidden="true" />
              <p className="text-sm text-text-tertiary">All clear. Nothing needs your attention right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  href={rec.href}
                  className="glass-panel w-full flex items-center gap-4 p-4 rounded-radius-xl border border-border-secondary hover:border-accent/40 transition-all group min-h-11"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${rec.urgent ? 'bg-warning' : 'bg-accent'}`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary leading-tight">{rec.title}</p>
                    <p className="text-2xs text-text-tertiary truncate mt-0.5">{rec.reason}</p>
                  </div>
                  <ChevronRight size={16} aria-hidden="true" className="text-text-disabled group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Label>Quick access</Label>
            <div className="space-y-2">
              {QUICK.map(({ href, label, icon: Icon, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="glass-panel w-full flex items-center gap-4 p-4 rounded-radius-xl border border-border-secondary hover:border-border-primary transition-all group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center shrink-0 group-hover:border-accent/30 transition-colors">
                    <Icon size={18} aria-hidden="true" className="text-text-tertiary group-hover:text-accent transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary leading-tight">{label}</p>
                    <p className="text-2xs text-text-tertiary truncate mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight size={16} aria-hidden="true" className="text-text-disabled group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <Label>System layers</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LAYER_DEFS.map((l) => {
                const status = layerHealth[l.id] ?? 'Checking';
                return (
                  <div key={l.id} className="glass-panel rounded-radius-xl p-4 text-center border border-border-secondary">
                    <p className="text-2xs font-black text-text-tertiary font-mono">{l.id}</p>
                    <p className="text-sm font-bold text-text-primary mt-0.5">{l.name}</p>
                    <span className={`inline-block mt-2 text-2xs font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${STATUS_BADGE[status]}`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionErrorBoundary>
    </AppShell>
  );
}
