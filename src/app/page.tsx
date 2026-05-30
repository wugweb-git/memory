"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, User, Search, RefreshCcw, Sparkles, Plus, ArrowUpRight,
  Activity, ShieldCheck, Database, Zap, Lock,
  Link2, Settings, Eye, Archive, Cpu, LayoutDashboard,
  TrendingUp, GitBranch, Globe, ChevronRight
} from 'lucide-react';
import type { UIMessage } from 'ai';
import { usePrismChat } from '@/hooks/usePrismChat';
import { resolveUserId } from '@/config/identity';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Sidebar, Section }         from './component/Sidebar';
import { TopNav }                   from './component/TopNav';
import { MobileNav }                from './component/MobileNav';
import { ProfileHeader }            from './component/ProfileHeader';
import { IdentityPillars }          from './component/IdentityPillars';
import { IndustryBento }            from './component/IndustryBento';
import { IdentityShowcase }         from './component/IdentityShowcase';
import { MemoryVaultWithUpload }    from './component/MemoryVaultWithUpload';
import { MemoryVault }              from './component/MemoryVault';
import { JobSearchAgent }           from './component/JobSearchAgent';
import { BlobBuffer }               from './component/BlobBuffer';
import { ActivityLog }              from './component/ActivityLog';
import { VoiceIngestion }           from './component/VoiceIngestion';
import { InspirationHub }           from './component/InspirationHub';
import { PublishedWorks }           from './component/PublishedWorks';
import { JobPipeline }              from './component/JobPipeline';
import { VentureVault }             from './component/VentureVault';
import { ExperienceMatrix }         from './component/ExperienceMatrix';
import { NeuralConnections }        from './component/NeuralConnections';
import { IntegrationMatrix }        from './component/IntegrationMatrix';
import { UniversalSync }            from './component/UniversalSync';
import { getExternalLinks } from '@/config/identity';
import { EnhancementHub }           from './component/EnhancementHub';
import CognitiveConsole             from './cognitive/page';
import { useDashboardData, usePersonaTraits } from './hooks/useDashboardData';
import { useProfileData } from '@/hooks/useProfileData';
import Link from 'next/link';
import { IDENTITY_CONFIG } from '@/config/identity';
import { UI_API } from '@/lib/api/endpoints';
import { AuthPanel } from './component/AuthPanel';

/* ── ErrorBoundary ───────────────────────────────────────────── */
class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="glass-panel rounded-[2rem] border border-danger/20 p-6 text-center">
          <p className="text-sm text-danger font-bold">Section failed to load</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── LoadingPlaceholder ─────────────────────────────────────── */
const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = "h-24" }) => (
  <div className={`glass-panel rounded-[2rem] border border-border-secondary p-6 animate-pulse ${className}`}>
    <div className="h-3 w-1/3 bg-secondary rounded mb-3" />
    <div className="h-8 w-1/2 bg-secondary rounded" />
  </div>
);

/* ── PageShell ─────────────────────────────────────────────────── */
const PageShell: React.FC<{
  title: string;
  subtitle?: string;
  icon: any;
  badge?: string;
  readOnly?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, badge, readOnly, action, children }) => (
  <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
    <header className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 w-9 h-9 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
          <Icon size={17} className="text-text-tertiary" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-text-primary tracking-tight uppercase italic">{title}</h1>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                {badge}
              </span>
            )}
            {readOnly && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-text-disabled border border-border-secondary">
                <Lock size={9} /> Read-only
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-text-tertiary mt-0.5 font-medium">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-3 px-1">
    {children}
  </h2>
);

const StatCard: React.FC<{
  label: string; value: string; sub?: string;
  color?: string; icon: React.ReactNode;
}> = ({ label, value, sub, color = 'text-text-primary', icon }) => (
  <div className="glass-panel rounded-[2rem] p-6 border border-border-secondary shadow-2xl flex items-start justify-between">
    <div>
      <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-text-disabled mt-1 font-bold">{sub}</p>}
    </div>
    <div className="w-10 h-10 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center">
      {icon}
    </div>
  </div>
);

/* ── Dashboard ────────────────────────────────────────────────── */
const Overview: React.FC<{ onNav: (s: Section) => void }> = ({ onNav }) => {
  const { stats, loading } = useDashboardData();

  const QUICK: Array<{ id: Section; label: string; icon: any; desc: string }> = [
    { id: 'twin',      label: 'Chat with Digital Twin',  icon: Brain,    desc: 'Ask anything grounded in your memory' },
    { id: 'memory',    label: 'Memory Vault',            icon: Database, desc: `${stats.memoryPackets} indexed` },
    { id: 'buffer',    label: 'Buffer Queue',            icon: Archive,  desc: `${stats.bufferQueue} pending` },
    { id: 'cognitive', label: 'Decision Engine',         icon: Cpu,      desc: 'Architect · Founder · Operator' },
  ];

  const LAYERS = [
    { id: 'L0', name: 'Intake',     status: 'Active',  badge: 'bg-success/10 text-success border-success/20' },
    { id: 'L1', name: 'Memory',     status: 'Active',  badge: 'bg-success/10 text-success border-success/20' },
    { id: 'L2', name: 'Processing', status: 'Active',  badge: 'bg-success/10 text-success border-success/20' },
    { id: 'L3', name: 'Identity',   status: 'Active',  badge: 'bg-accent/10 text-accent border-accent/20' },
    { id: 'L4', name: 'Cognitive',  status: 'Standby', badge: 'bg-warning/10 text-warning border-warning/20' },
  ];

  if (loading) {
    return (
      <PageShell title="Dashboard" subtitle="Identity Prism at a glance" icon={LayoutDashboard}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <LoadingSkeleton key={i} className="h-28" />)}
        </div>
      </PageShell>
    );
  }

  return (
    <SectionErrorBoundary>
      <PageShell title="Dashboard" subtitle="Identity Prism at a glance" icon={LayoutDashboard}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Memory Packets" value={stats.memoryPackets} sub="Total indexed" icon={<Database size={18} className="text-accent" />} />
          <StatCard label="Sync Status" value={stats.syncStatus} sub="All layers nominal" color="text-success" icon={<ShieldCheck size={18} className="text-success" />} />
          <StatCard label="Buffer Queue" value={stats.bufferQueue} sub="Pending review" icon={<Archive size={18} className="text-warning" />} />
          <StatCard label="Uplink" value={stats.uplink} sub="Last 24h" icon={<Zap size={18} className="text-accent" />} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Label>Quick Access</Label>
            <div className="space-y-2">
              {QUICK.map(({ id, label, icon: Icon, desc }) => (
                <button key={id} onClick={() => onNav(id)}
                  className="glass-panel w-full flex items-center gap-4 p-4 rounded-[1.5rem] border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all group text-left">
                  <div className="w-10 h-10 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center shrink-0 group-hover:border-accent/30 transition-colors">
                    <Icon size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary leading-tight">{label}</p>
                    <p className="text-[11px] text-text-tertiary truncate mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-text-disabled group-hover:text-accent transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>System Layers</Label>
            <div className="grid grid-cols-5 gap-3">
              {LAYERS.map(l => (
                <div key={l.id} className="glass-panel rounded-[1.5rem] p-4 text-center border border-border-secondary shadow-xl">
                  <p className="text-[10px] font-black text-text-disabled font-mono">{l.id}</p>
                  <p className="text-sm font-bold text-text-primary mt-0.5">{l.name}</p>
                  <span className={`inline-block mt-2 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${l.badge}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    </SectionErrorBoundary>
  );
};

/* ── Profile ──────────────────────────────────────────────────── */
const ProfileSection: React.FC<{
  selectedIndustry: string | null;
  onSelectIndustry: (s: string | null) => void;
}> = ({ selectedIndustry, onSelectIndustry }) => (
  <PageShell title="Profile" subtitle="Your identity, skills and sector map" icon={User}>
    <ProfileHeader />
    <div><Label>Identity Pillars</Label><IdentityPillars /></div>
    <div><Label>Sector Map</Label>
      <IndustryBento selected={selectedIndustry || undefined} onSelect={onSelectIndustry} />
    </div>
    <div><Label>Published Works</Label><PublishedWorks /></div>
    <div><Label>Job Pipeline</Label><JobPipeline /></div>
    <div><Label>Opportunity Agent</Label><JobSearchAgent /></div>
    <div><Label>Venture Vault</Label>
      <VentureVault selectedIndustry={selectedIndustry || undefined} />
    </div>
    <div><Label>Experience Matrix</Label>
      <ExperienceMatrix selectedIndustry={selectedIndustry || undefined} />
    </div>
  </PageShell>
);

function chatMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

/* ── Digital Twin ─────────────────────────────────────────────── */
const DigitalTwinSection: React.FC = () => {
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, setMessages } = usePrismChat(UI_API.chat);
  const isLoading = status === 'submitted' || status === 'streaming';

  const send = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const highlight = (text: string) => {
    const kw = ['AI', 'Fintech', 'Identity', 'UX', 'Architecture', 'Prism', 'RAG', 'Vector'];
    const parts = text.split(new RegExp(`(${kw.join('|')})`, 'gi'));
    return parts.map((p, i) =>
      kw.some(k => k.toLowerCase() === p.toLowerCase())
        ? <span key={i} className="text-accent font-bold">{p}</span> : p
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
            <Brain size={17} className="text-text-tertiary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-text-primary uppercase italic">Digital Twin</h1>
            <p className="text-sm text-text-tertiary mt-0.5">RAG-grounded conversational interface</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            className="text-[11px] font-bold text-danger hover:bg-danger/5 px-3 py-1.5 rounded-xl border border-danger/20 transition-colors">
            Clear
          </button>
        )}
      </header>

      <div className="glass-panel rounded-[2rem] border border-border-secondary min-h-[380px] md:min-h-[440px] max-h-[520px] overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-4 shadow-3xl">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 gap-4">
            <div className="w-16 h-16 rounded-[2rem] bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Sparkles size={26} className="text-accent" />
            </div>
            <div>
              <p className="text-base font-black text-text-primary uppercase italic">Prism is ready</p>
              <p className="text-sm text-text-tertiary mt-1 max-w-xs">Your Digital Twin is grounded in your full memory graph.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => {
              const text = chatMessageText(m as UIMessage);
              return (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  m.role === 'user' ? 'bg-text-primary text-bg-primary border-transparent' : 'bg-accent/10 text-accent border-accent/20'
                }`}>
                  {m.role === 'user' ? <User size={14} /> : <Brain size={14} />}
                </div>
                <div className={`max-w-[85%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-text-primary text-bg-primary rounded-tr-sm'
                      : 'bg-secondary border border-border-secondary text-text-primary rounded-tl-sm'
                  }`}>
                    {m.role !== 'user' ? highlight(text) : text}
                  </div>
                  <span className="text-[10px] font-mono text-text-disabled mt-1 px-1">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            );})}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Brain size={14} className="text-accent" />
                </div>
                <div className="bg-secondary border border-border-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      <form onSubmit={send} className="glass-panel rounded-[2rem] border border-border-secondary overflow-hidden shadow-2xl">
        <div className="flex items-start gap-3 px-4 py-3">
          <Search size={17} className="mt-1 text-text-disabled shrink-0" />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoading && input.trim()) send(e as any); } }}
            placeholder="Pose a cognitive query to the Digital Twin…"
            rows={2}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-disabled placeholder:italic focus:outline-none resize-none"
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-secondary/60 bg-secondary/20">
          <span className="text-[10px] font-mono text-text-disabled hidden sm:block">Shift+Enter for new line</span>
          <button type="submit" disabled={isLoading || !input.trim()}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-primary text-[11px] font-black uppercase tracking-widest rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-high transition-colors">
            {isLoading ? <RefreshCcw size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
            {isLoading ? 'Thinking…' : 'Initiate Synapse'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ── Public Showcase ──────────────────────────────────────────── */
const ShowcaseSection: React.FC = () => (
  <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
    <header className="flex items-start gap-3">
      <div className="mt-0.5 w-9 h-9 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
        <Eye size={17} className="text-text-tertiary" />
      </div>
      <div>
        <h1 className="text-xl font-black text-text-primary uppercase italic">Public Showcase</h1>
        <p className="text-sm text-text-tertiary mt-0.5">Your public-facing identity surfaces</p>
      </div>
    </header>
    <IdentityShowcase />
  </div>
);

/* ── Memory ───────────────────────────────────────────────────── */
const MemorySection: React.FC = () => (
  <PageShell title="Memory Vault" subtitle="Indexed knowledge packets — upload, search and manage" icon={Database}>
    <div><Label>Upload &amp; Ingest</Label><MemoryVaultWithUpload /></div>
    <div><Label>Fragment Browser</Label><MemoryVault /></div>
  </PageShell>
);

/* ── Buffer ───────────────────────────────────────────────────── */
const BufferSection: React.FC = () => (
  <PageShell title="Buffer Queue" subtitle="L0 intake — review and promote raw signals" icon={Archive}>
    <BlobBuffer />
  </PageShell>
);

/* ── Activity ─────────────────────────────────────────────────── */
const ActivitySection: React.FC = () => (
  <PageShell title="Activity" subtitle="Signals, voice ingestion and inspiration feed" icon={Activity}>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <Label>Cognitive Intake</Label>
        <div className="glass-panel rounded-[2rem] border border-border-secondary p-6 shadow-2xl">
          <VoiceIngestion />
        </div>
        <Label>Activity Log</Label>
        <ActivityLog />
      </div>
      <div>
        <Label>Inspiration Feed</Label>
        <InspirationHub />
      </div>
    </div>
    <div><Label>Neural Connections</Label><NeuralConnections /></div>
  </PageShell>
);

/* ── Cognitive ────────────────────────────────────────────────── */
const CognitiveSection: React.FC = () => (
  <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
    <header className="flex items-start gap-3">
      <div className="mt-0.5 w-9 h-9 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
        <Cpu size={17} className="text-text-tertiary" />
      </div>
      <div>
        <h1 className="text-xl font-black text-text-primary uppercase italic">Cognitive Engine</h1>
        <p className="text-sm text-text-tertiary mt-0.5">L4 decision synthesis — Architect · Founder · Operator</p>
      </div>
    </header>
    <CognitiveConsole />
  </div>
);

/* ── Persona ──────────────────────────────────────────────────── */
const PersonaSection: React.FC = () => {
  const { traits, loading, refetch: refetchTraits } = usePersonaTraits();
  const { profile, refetch: refetchProfile } = useProfileData();
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildNote, setRebuildNote] = useState<string | null>(null);

  const regeneratePersona = async () => {
    const { userId } = resolveUserId();
    setRebuilding(true);
    setRebuildNote(null);
    try {
      const res = await fetch('/api/persona/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, useProfileSource: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRebuildNote(data.reason === 'ai_contamination_detected'
          ? 'Rebuild blocked: source text looks AI-generated. Edit your profile bio first.'
          : data.reason ?? 'Rebuild failed');
        return;
      }
      setRebuildNote('Persona rebuilt from profile sources.');
      await Promise.all([refetchTraits(), refetchProfile()]);
    } catch {
      setRebuildNote('Rebuild request failed.');
    } finally {
      setRebuilding(false);
    }
  };
  const ventureTags = profile?.sections
    ?.filter((s) => s.type === 'venture')
    .flatMap((s) => {
      const c = (s.content ?? {}) as Record<string, unknown>;
      return Array.isArray(c.tags) ? (c.tags as string[]) : [];
    }) ?? [];
  const keywords = ventureTags.length > 0 ? [...new Set(ventureTags)].slice(0, 8) : [];

  return (
    <PageShell title="Persona" subtitle="AI-synthesized behavioral profile and positioning" icon={Sparkles}>
      <div>
        <Label>Synthesized Bio</Label>
        <div className="glass-panel rounded-[2rem] border border-border-secondary p-6 shadow-2xl">
          <p className="text-sm text-text-secondary leading-relaxed">
            {profile?.bio ?? 'Connect persona APIs and seed profile data to populate this section.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={regeneratePersona}
              disabled={rebuilding}
              className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {rebuilding ? 'Regenerating…' : 'Regenerate with LLM'}
            </button>
            <Link href="/persona" className="text-[11px] font-black text-accent uppercase tracking-widest hover:underline">
              Full persona console →
            </Link>
          </div>
          {rebuildNote && (
            <p className="mt-2 text-[11px] text-text-tertiary">{rebuildNote}</p>
          )}
        </div>
      </div>
      <div>
        <Label>Trait Scores</Label>
        {loading ? (
          <p className="text-sm text-text-tertiary italic px-2">Loading traits…</p>
        ) : traits.length === 0 ? (
          <p className="text-sm text-text-tertiary italic px-2">No persona traits yet. Use the persona console to provide feedback and rebuild.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {traits.map((t: { name: string; score: number; desc?: string }) => (
            <div key={t.name} className="glass-panel rounded-[2rem] border border-border-secondary p-5 space-y-3 shadow-xl">
              <div className="flex justify-between">
                <span className="text-sm font-bold text-text-primary">{t.name}</span>
                <span className="text-sm font-black text-text-primary font-mono">{Math.round((t.score || 0) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden border border-border-primary">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(t.score || 0) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-accent-high rounded-full" />
              </div>
              <p className="text-[11px] text-text-tertiary">{t.desc ?? ''}</p>
            </div>
          ))}
        </div>
        )}
      </div>
      {keywords.length > 0 && (
      <div>
        <Label>Positioning Keywords</Label>
        <div className="glass-panel rounded-[2rem] border border-border-secondary p-5 shadow-xl flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className="px-3 py-1.5 bg-secondary border border-border-primary rounded-xl text-[12px] font-bold text-text-secondary uppercase tracking-wide">{k}</span>
          ))}
        </div>
      </div>
      )}
    </PageShell>
  );
};

/* ── Syncs ────────────────────────────────────────────────────── */
const SyncsSection: React.FC = () => {
  const links = getExternalLinks();
  const linkIcons: Record<string, typeof Globe> = {
    Portfolio: Globe,
    GitHub: GitBranch,
    LinkedIn: Link2,
    'Site Extension': TrendingUp,
  };

  return (
    <PageShell title="Integrations & Syncs" subtitle="All external connections and their live status" icon={Link2}>
      <UniversalSync />
      <IntegrationMatrix />
      <div>
        <Label>External Links</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((e) => {
            const Icon = linkIcons[e.label] ?? Globe;
            return (
            <a
              key={e.label}
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel flex items-center gap-3 rounded-[1.5rem] border border-border-secondary px-4 py-4 shadow-xl hover:border-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center shrink-0">
                <Icon size={17} className="text-text-disabled" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary">{e.label}</p>
                <p className="text-[11px] font-mono text-text-tertiary truncate italic">{e.placeholder}</p>
              </div>
            </a>
          );})}
        </div>
      </div>
    </PageShell>
  );
};

/* ── Settings ─────────────────────────────────────────────────── */
const SettingsSection: React.FC = () => {
  const userMeta = {
    displayName: IDENTITY_CONFIG.DISPLAY_NAME,
    handle: `@${IDENTITY_CONFIG.HANDLE}`,
    email: IDENTITY_CONFIG.EMAIL,
  };
  return (
    <PageShell title="Settings" subtitle="Account preferences and layer configuration" icon={Settings}>
      <div>
        <Label>Account</Label>
        <AuthPanel />
      </div>
      <div>
        <Label>Profile Metadata</Label>
        <div className="glass-panel rounded-[2rem] border border-border-secondary divide-y divide-border-secondary/60 overflow-hidden shadow-2xl">
          {[
            { label: 'Display Name', value: userMeta.displayName },
            { label: 'Handle', value: userMeta.handle },
            { label: 'Email', value: userMeta.email },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-text-secondary font-medium">{row.label}</span>
              <span className="text-xs font-black tracking-wider uppercase text-text-primary">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Notifications</Label>
        <div className="glass-panel rounded-[2rem] border border-border-secondary divide-y divide-border-secondary/60 overflow-hidden shadow-2xl">
          {[
            { label: 'Memory sync alerts',      on: true  },
            { label: 'Cognitive decisions',     on: true  },
            { label: 'Buffer queue full',       on: true  },
            { label: 'New connections synced',  on: false },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors">
              <span className="text-sm text-text-secondary font-medium">{r.label}</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${r.on ? 'bg-success' : 'bg-border-primary'}`}>
                <div className={`w-4 h-4 bg-bg-elevated rounded-full shadow-sm transition-transform duration-200 ${r.on ? 'translate-x-4' : ''}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Clear Data</Label>
        <div className="glass-panel rounded-[2rem] border border-danger/20 divide-y divide-danger/10 overflow-hidden shadow-2xl">
          {[
            { label: 'Clear all memory',   desc: 'Permanently delete all indexed packets' },
            { label: 'Reset Digital Twin', desc: 'Wipe chat history and re-anchor' },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between px-5 py-4 hover:bg-danger/5 transition-colors">
              <div>
                <p className="text-sm font-bold text-text-primary">{r.label}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{r.desc}</p>
              </div>
              <button className="text-[11px] font-black text-danger border border-danger/20 px-3 py-1.5 rounded-xl hover:bg-danger/10 transition-colors uppercase tracking-widest shrink-0">
                Clear
              </button>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

/* ── Root ─────────────────────────────────────────────────────── */
export default function IdentityPrismWorkspace() {
  const [section, setSection]           = useState<Section>('overview');
  const [selectedIndustry, setIndustry] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const render = () => {
    switch (section) {
      case 'overview':  return <Overview onNav={setSection} />;
      case 'profile':   return <ProfileSection selectedIndustry={selectedIndustry} onSelectIndustry={setIndustry} />;
      case 'twin':      return <DigitalTwinSection />;
      case 'showcase':  return <ShowcaseSection />;
      case 'memory':    return <MemorySection />;
      case 'buffer':    return <BufferSection />;
      case 'activity':  return <ActivitySection />;
      case 'cognitive': return <CognitiveSection />;
      case 'persona':   return <PersonaSection />;
      case 'syncs':     return <SyncsSection />;
      case 'settings':  return <SettingsSection />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <ToastContainer
        position="bottom-right"
        toastClassName="!bg-bg-elevated !border !border-border-secondary !rounded-[2rem] !shadow-3xl !text-text-primary !text-sm"
      />
      <Sidebar
        current={section}
        onChange={setSection}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <TopNav
        current={section}
        onChange={setSection}
        onMenuToggle={() => setMobileMenuOpen((v) => !v)}
      />
      <MobileNav current={section} onChange={setSection} />
      <main className="flex-1 md:ml-60 mt-14 pb-20 md:pb-0 overflow-y-auto custom-scrollbar bg-bg-primary">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {render()}
          </motion.div>
        </AnimatePresence>
      </main>
      <EnhancementHub />
    </div>
  );
}