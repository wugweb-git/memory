"use client";

import React from 'react';
import Link from 'next/link';
import {
  Database, ShieldCheck, Archive, Zap, Brain, Cpu,
  ChevronRight, LayoutDashboard, FileText, Sparkles,
} from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppShell } from './component/AppShell';
import { useDashboardData } from './hooks/useDashboardData';

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

const LAYERS = [
  { id: 'L0', name: 'Intake',     badge: 'bg-success/10 text-success border-success/20', status: 'Active' },
  { id: 'L1', name: 'Memory',     badge: 'bg-success/10 text-success border-success/20', status: 'Active' },
  { id: 'L2', name: 'Processing', badge: 'bg-success/10 text-success border-success/20', status: 'Active' },
  { id: 'L3', name: 'Cognitive',  badge: 'bg-accent/10 text-accent border-accent/20',   status: 'Active' },
  { id: 'L4', name: 'Persona',    badge: 'bg-warning/10 text-warning border-warning/20', status: 'Standby' },
] as const;

export default function ConsolePage() {
  const { stats, loading } = useDashboardData();

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {LAYERS.map((l) => (
                <div key={l.id} className="glass-panel rounded-radius-xl p-4 text-center border border-border-secondary">
                  <p className="text-2xs font-black text-text-disabled font-mono">{l.id}</p>
                  <p className="text-sm font-bold text-text-primary mt-0.5">{l.name}</p>
                  <span className={`inline-block mt-2 text-2xs font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${l.badge}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionErrorBoundary>
    </AppShell>
  );
}
