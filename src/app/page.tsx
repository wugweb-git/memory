"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database, ShieldCheck, Archive, Zap, Brain, Cpu,
  ChevronRight, LayoutDashboard, FileText, Sparkles,
} from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppShell } from './component/AppShell';
import { useDashboardData } from './hooks/useDashboardData';
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
          <p className="text-sm text-danger font-bold">Dashboard failed to load</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Primitives ───────────────────────────────────────────────── */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-2xs font-black text-text-tertiary uppercase tracking-[0.3em] mb-3 px-1">{children}</h2>
);

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; icon: React.ReactNode }> =
({ label, value, sub, color = 'text-text-primary', icon }) => (
  <div className="glass-panel rounded-radius-xl p-6 border border-border-secondary flex items-start justify-between">
    <div>
      <p className="text-2xs font-black text-text-tertiary uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-2xs text-text-disabled mt-1 font-bold">{sub}</p>}
    </div>
    <div className="w-10 h-10 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center shrink-0">
      {icon}
    </div>
  </div>
);

const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-28' }) => (
  <div className={`glass-panel rounded-radius-xl border border-border-secondary p-6 animate-pulse ${className}`}>
    <div className="h-3 w-1/3 bg-secondary rounded mb-3" />
    <div className="h-8 w-1/2 bg-secondary rounded" />
  </div>
);

/* ── Console ──────────────────────────────────────────────────── */
const QUICK = [
  { href: '/ask',       label: 'Chat with Digital Twin', icon: Brain,    desc: 'Ask anything grounded in your memory' },
  { href: '/memory',    label: 'Memory Vault',           icon: Database,  desc: 'Indexed knowledge packets' },
  { href: '/buffer',    label: 'Buffer Queue',           icon: Archive,   desc: 'Pending intake for review' },
  { href: '/cognitive', label: 'Decision Engine',        icon: Cpu,       desc: 'Architect · Founder · Operator' },
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
  Checking: 'bg-secondary text-text-disabled border-border-secondary',
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
      const mongoLayers = fetch('/api/health/system')
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

      const [l012, l3, l4, l5] = await Promise.all([
        mongoLayers,
        ping('/api/cognitive/history'),
        ping('/api/persona/profile'),
        ping('/api/output/history'),
      ]);

      if (!cancelled) {
        setLayers({ L0: l012, L1: l012, L2: l012, L3: l3, L4: l4, L5: l5 });
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
  useEffect(() => {
    fetch(UI_API.recommendations)
      .then((r) => (r.ok ? r.json() : { recommendations: [] }))
      .then((j) => setRecs(Array.isArray(j.recommendations) ? j.recommendations : []))
      .catch(() => setRecs([]));
  }, []);
  return recs;
}

export default function ConsolePage() {
  const { stats, loading } = useDashboardData();
  const layerHealth = useLayerHealth();
  const recommendations = useRecommendations();

  return (
    <AppShell>
      <ToastContainer
        position="bottom-right"
        toastClassName="!bg-bg-elevated !border !border-border-secondary !rounded-2xl !shadow-3xl !text-text-primary !text-sm"
      />

      <header className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
          <LayoutDashboard size={20} className="text-text-tertiary" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight  text-text-primary">Console</h1>
          <p className="text-sm text-text-tertiary font-medium">Identity Prism at a glance</p>
        </div>
      </header>

      <SectionErrorBoundary>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} />)
          ) : (
            <>
              <StatCard label="Memory Packets" value={String(stats.memoryPackets)} sub="Total indexed" icon={<Database size={18} className="text-accent" />} />
              <StatCard label="Sync Status" value={String(stats.syncStatus)} sub="All layers nominal" color="text-success" icon={<ShieldCheck size={18} className="text-success" />} />
              <StatCard label="Buffer Queue" value={String(stats.bufferQueue)} sub="Pending review" icon={<Archive size={18} className="text-warning" />} />
              <StatCard label="Uplink" value={String(stats.uplink)} sub="Last 24h" icon={<Zap size={18} className="text-accent" />} />
            </>
          )}
        </div>

        {/* Next best actions — the "act" surface (recommendation engine) */}
        <div className="mb-8">
          <Label>Next best actions</Label>
          {recommendations === null ? (
            <Skeleton className="h-20" />
          ) : recommendations.length === 0 ? (
            <div className="glass-panel rounded-radius-xl border border-border-secondary p-5 flex items-center gap-3">
              <ShieldCheck size={18} className="text-success shrink-0" />
              <p className="text-sm text-text-tertiary">All clear — nothing needs your attention right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  href={rec.href}
                  className="glass-panel w-full flex items-center gap-4 p-4 rounded-radius-xl border border-border-secondary hover:border-accent/40 transition-all group"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${rec.urgent ? 'bg-warning' : 'bg-accent'}`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary leading-tight">{rec.title}</p>
                    <p className="text-2xs text-text-tertiary truncate mt-0.5">{rec.reason}</p>
                  </div>
                  <ChevronRight size={16} className="text-text-disabled group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Label>Quick Access</Label>
            <div className="space-y-2">
              {QUICK.map(({ href, label, icon: Icon, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="glass-panel w-full flex items-center gap-4 p-4 rounded-radius-xl border border-border-secondary hover:border-border-primary transition-all group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center shrink-0 group-hover:border-accent/30 transition-colors">
                    <Icon size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary leading-tight">{label}</p>
                    <p className="text-2xs text-text-tertiary truncate mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-text-disabled group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <Label>System Layers</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LAYER_DEFS.map((l) => {
                const status = layerHealth[l.id] ?? 'Checking';
                return (
                  <div key={l.id} className="glass-panel rounded-radius-xl p-4 text-center border border-border-secondary">
                    <p className="text-2xs font-black text-text-disabled font-mono">{l.id}</p>
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
