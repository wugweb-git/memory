"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database, ShieldCheck, Archive, Zap, Brain, Cpu,
  ChevronRight, FileText, Sparkles, AlertCircle, RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/app/component/AppShell';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import { UI_API } from '@/lib/api/endpoints';
import { Card, Skeleton, PageHeader } from '@/components/ui/primitives';

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
        <Card role="alert" className="border-danger/30 p-6 text-center space-y-3">
          <p className="text-base font-semibold text-danger">The console could not render.</p>
          <p className="text-sm text-text-secondary">Reload the page to try again. If it keeps happening, check the system page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Reload page
          </button>
        </Card>
      );
    }
    return this.props.children;
  }
}

/* ── Primitives ───────────────────────────────────────────────── */
const SectionTitle: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="mb-3 px-1 text-base font-semibold text-text-primary">{children}</h2>
);

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; icon: React.ReactNode }> =
({ label, value, sub, color = 'text-text-primary', icon }) => (
  <Card className="flex min-h-28 flex-col justify-between gap-1 p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-text-secondary">{label}</p>
      <span aria-hidden="true" className="shrink-0">{icon}</span>
    </div>
    <div className="min-w-0">
      <p className={`text-xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-sm text-text-secondary">{sub}</p>}
    </div>
  </Card>
);

/** API status words arrive upper-case (DEGRADED). Show them in sentence case. */
const sentenceCase = (v: string) => (/^[A-Za-z]+$/.test(v) ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v);

const ROW_LINK =
  'group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border-primary bg-bg-elevated px-4 py-3 transition-colors hover:bg-bg-secondary active:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none';

/* ── Console ──────────────────────────────────────────────────── */
const QUICK = [
  { href: '/ask',       label: 'Ask your memory', icon: Brain,    desc: 'Answers grounded in your memory' },
  { href: '/memory',    label: 'Memory vault',           icon: Database,  desc: 'Indexed knowledge packets' },
  { href: '/buffer',    label: 'Buffer queue',           icon: Archive,   desc: 'Pending intake for review' },
  { href: '/cognitive', label: 'Decision engine',        icon: Cpu,       desc: 'Decide, evaluate and rank' },
  { href: '/persona',   label: 'Persona',                icon: Sparkles,  desc: 'Behavioral & style intelligence' },
  { href: '/content',   label: 'Content',                icon: FileText,  desc: 'Generated & published output' },
] as const;

type LayerStatus = 'Active' | 'Degraded' | 'Offline' | 'Checking' | 'Signed out';

const LAYER_DEFS = [
  { id: 'L0', name: 'Intake' },
  { id: 'L1', name: 'Memory' },
  { id: 'L2', name: 'Processing' },
  { id: 'L3', name: 'Cognitive' },
  { id: 'L4', name: 'Persona' },
  { id: 'L5', name: 'Output' },
] as const;

const STATUS_STYLE: Record<LayerStatus, { text: string; dot: string }> = {
  Active:   { text: 'text-success',         dot: 'bg-success' },
  Degraded: { text: 'text-warning',         dot: 'bg-warning' },
  Offline:  { text: 'text-danger',          dot: 'bg-danger' },
  Checking: { text: 'text-text-tertiary',   dot: 'bg-text-tertiary motion-safe:animate-pulse' },
  'Signed out': { text: 'text-warning',     dot: 'bg-warning' },
};

/** Real per-layer health, probed from the layers' own APIs — no pretend statuses. */
function useLayerHealth(): { layers: Record<string, LayerStatus>; recheck: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [layers, setLayers] = useState<Record<string, LayerStatus>>(
    Object.fromEntries(LAYER_DEFS.map((l) => [l.id, 'Checking'])),
  );

  useEffect(() => {
    let cancelled = false;
    setLayers(Object.fromEntries(LAYER_DEFS.map((l) => [l.id, 'Checking'])));

    async function probe() {
      // L0–L2 live in the ingestion store; one health call covers them.
      const ingestionLayers = fetch('/api/health/system')
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((h) => {
          const s: LayerStatus =
            h.status === 'LOCKED' ? 'Active' : h.status === 'DEGRADED' ? 'Degraded' : 'Offline';
          // A degraded response with 0 packets usually means the DB is unreachable.
          return h.warning ? 'Offline' : s;
        })
        .catch((e): LayerStatus => (e === 401 ? 'Signed out' : 'Offline'));

      // A 401 means the session ended, not that the layer is down.
      const ping = (url: string) =>
        fetch(url)
          .then((r): LayerStatus => (r.ok ? 'Active' : r.status === 401 ? 'Signed out' : 'Offline'))
          .catch((): LayerStatus => 'Offline');

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
  }, [attempt]);

  return { layers, recheck: () => setAttempt((n) => n + 1) };
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
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setRecs(null);
    setFailed(false);
    fetch(UI_API.recommendations)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then((j) => { if (!cancelled) setRecs(Array.isArray(j.recommendations) ? j.recommendations : []); })
      .catch(() => { if (!cancelled) { setRecs([]); setFailed(true); } });
    return () => { cancelled = true; };
  }, [attempt]);
  return { recs, failed, retry: () => setAttempt((n) => n + 1) };
}

export default function ConsolePage() {
  const { stats, loading } = useDashboardData();
  const { layers: layerHealth, recheck } = useLayerHealth();
  const signedOut = Object.values(layerHealth).some((v) => v === 'Signed out');
  const { recs: recommendations, failed: recsFailed, retry: retryRecs } = useRecommendations();
  const syncKey = String(stats.syncStatus).toLowerCase();
  const syncUnknown = syncKey === 'unknown' || syncKey === '—';
  const syncBad = syncKey === 'degraded' || syncKey === 'offline';
  const syncColor = syncUnknown ? 'text-text-tertiary' : syncBad ? 'text-warning' : 'text-success';
  const syncSub = syncUnknown ? 'Health check unavailable' : syncBad ? 'Some layers need attention' : 'All layers nominal';

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
      <PageHeader className="mb-6" title="Console" description="What needs you today, and how the system is doing" />

      <SectionErrorBoundary>
        {/* Next best actions: the one primary surface on this screen */}
        <section aria-labelledby="console-next" className="mb-6">
          <SectionTitle id="console-next">Next best actions</SectionTitle>
          {recommendations === null ? (
            <div className="space-y-2" role="status" aria-label="Loading next actions">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : recsFailed ? (
            <Card role="alert" className="flex flex-col gap-3 border-danger/30 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                <p className="text-base text-text-secondary">Could not load your next actions. Check your connection, then try again.</p>
              </div>
              <button
                type="button"
                onClick={retryRecs}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-primary px-5 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RefreshCw size={14} aria-hidden="true" /> Try again
              </button>
            </Card>
          ) : recommendations.length === 0 ? (
            <Card className="flex items-center gap-3">
              <ShieldCheck size={18} className="shrink-0 text-success" aria-hidden="true" />
              <p className="text-base text-text-secondary">All clear. Nothing needs your attention right now.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((rec) => (
                <li key={rec.id}>
                  <Link href={rec.href} className={ROW_LINK}>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${rec.urgent ? 'bg-warning' : 'bg-accent'}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      {rec.urgent ? <span className="sr-only">Urgent: </span> : null}
                      <span className="block text-base font-medium leading-snug text-text-primary">{rec.title}</span>
                      <span className="mt-0.5 block text-sm text-text-secondary line-clamp-2">{rec.reason}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-text-tertiary transition-colors group-hover:text-accent" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="console-stats" className="mb-6">
          <SectionTitle id="console-stats">System snapshot</SectionTitle>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy={loading}>
            {loading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)
            ) : (
              <>
                <StatCard label="Memory packets" value={String(stats.memoryPackets)} sub="Total indexed" icon={<Database size={18} className="text-accent" />} />
                <StatCard label="Sync status" value={sentenceCase(String(stats.syncStatus))} sub={syncSub} color={syncColor} icon={<ShieldCheck size={18} className={syncColor} />} />
                <StatCard label="Buffer queue" value={String(stats.bufferQueue)} sub="Pending review" icon={<Archive size={18} className="text-warning" />} />
                <StatCard label="Uplink" value={sentenceCase(String(stats.uplink))} sub="Reasoning reliability" icon={<Zap size={18} className="text-accent" />} />
              </>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-labelledby="console-quick">
            <SectionTitle id="console-quick">Quick access</SectionTitle>
            <ul className="space-y-2">
              {QUICK.map(({ href, label, icon: Icon, desc }) => (
                <li key={href}>
                  <Link href={href} className={ROW_LINK}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-primary bg-bg-secondary" aria-hidden="true">
                      <Icon size={18} className="text-text-tertiary transition-colors group-hover:text-accent" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium leading-snug text-text-primary">{label}</span>
                      <span className="mt-0.5 block truncate text-sm text-text-secondary">{desc}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-text-tertiary transition-colors group-hover:text-accent" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="console-layers">
            <SectionTitle id="console-layers">System layers</SectionTitle>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LAYER_DEFS.map((l) => {
                const status = layerHealth[l.id] ?? 'Checking';
                const st = STATUS_STYLE[status];
                return (
                  <li key={l.id}>
                    <Card className="h-full p-4">
                      <p className="font-mono text-xs text-text-secondary">{l.id}</p>
                      <p className="mt-0.5 text-base font-medium text-text-primary">{l.name}</p>
                      <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${st.text}`}>
                        <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden="true" />
                        {status}
                      </p>
                    </Card>
                  </li>
                );
              })}
            </ul>
            <div role="status" aria-live="polite">
              {signedOut ? (
                <p className="mt-3 px-1 text-sm text-text-secondary">
                  Your session has ended, so some layers could not be checked.{' '}
                  <Link href="/login?next=/console" className="font-medium text-accent underline underline-offset-2">Sign in again</Link>
                </p>
              ) : Object.values(layerHealth).some((v) => v === 'Offline') ? (
                <p className="mt-3 px-1 text-sm text-text-secondary">
                  A layer shows offline when its health check fails.
                </p>
              ) : null}
            </div>
            {Object.values(layerHealth).some((v) => v === 'Offline' || v === 'Signed out') ? (
              <button
                type="button"
                onClick={recheck}
                className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RefreshCw size={14} aria-hidden="true" /> Check again
              </button>
            ) : null}
          </section>
        </div>
      </SectionErrorBoundary>
      </div>
    </AppShell>
  );
}
