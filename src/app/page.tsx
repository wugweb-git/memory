"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, User, Search, RefreshCcw, Sparkles, Plus, ArrowUpRight,
  Activity, ShieldCheck, Database, Zap, X, CheckCircle2,
  Link2, Settings, Eye, Archive, Cpu, LayoutDashboard,
  TrendingUp, Clock, GitBranch, Globe, Bell, ChevronRight,
  AlertCircle, Lock
} from 'lucide-react';
import { useChat } from 'ai/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Sidebar, Section } from './component/Sidebar';
import { ProfileHeader }    from './component/ProfileHeader';
import { IdentityPillars }  from './component/IdentityPillars';
import { IndustryBento }    from './component/IndustryBento';
import { IdentityShowcase } from './component/IdentityShowcase';
import { MemoryVault }      from './component/MemoryVault';
import { BlobBuffer }       from './component/BlobBuffer';
import { ActivityLog }      from './component/ActivityLog';
import { VoiceIngestion }   from './component/VoiceIngestion';
import { InspirationHub }   from './component/InspirationHub';
import { PublishedWorks }   from './component/PublishedWorks';
import { JobPipeline }      from './component/JobPipeline';
import { VentureVault }     from './component/VentureVault';
import { ExperienceMatrix } from './component/ExperienceMatrix';
import { NeuralConnections } from './component/NeuralConnections';
import { IntegrationMatrix } from './component/IntegrationMatrix';
import { EnhancementHub }   from './component/EnhancementHub';
import CognitiveConsole     from './cognitive/page';

/* ─── Page section wrapper ─────────────────────────────────────── */
const PageWrap: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  readOnly?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, badge, readOnly, children }) => (
  <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
    <header className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">{title}</h1>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {badge}
              </span>
            )}
            {readOnly && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#888] border border-[#E8E8E8]">
                <Lock size={10} /> Read-only
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-[#888] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
    {children}
  </div>
);

/* ─── Section label ─────────────────────────────────────────────── */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">
    {children}
  </h2>
);

/* ─── Stat card ─────────────────────────────────────────────────── */
const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; icon: React.ReactNode }> = ({
  label, value, sub, color = 'text-[#1A1A1A]', icon,
}) => (
  <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 flex items-start justify-between">
    <div>
      <p className="text-xs text-[#999] font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#BBB] mt-1">{sub}</p>}
    </div>
    <div className="w-9 h-9 rounded-xl bg-[#F7F7F7] flex items-center justify-center">
      {icon}
    </div>
  </div>
);

/* ─── Overview dashboard ─────────────────────────────────────────── */
const Overview: React.FC<{ onNav: (s: Section) => void }> = ({ onNav }) => {
  const QUICK = [
    { id: 'twin' as Section,      label: 'Chat with Digital Twin',  icon: Brain,          desc: 'Ask anything about your memory graph' },
    { id: 'memory' as Section,    label: 'Explore Memory Vault',    icon: Database,       desc: '4.2k indexed packets' },
    { id: 'buffer' as Section,    label: 'Review Buffer Queue',     icon: Archive,        desc: '3 items awaiting review' },
    { id: 'cognitive' as Section, label: 'Run Decision Engine',     icon: Cpu,            desc: 'Architect · Founder · Operator' },
  ];

  const RECENT = [
    { time: '2m ago',  text: 'Memory packet ingested from GitHub',       dot: 'bg-blue-400' },
    { time: '14m ago', text: 'Digital Twin query completed',              dot: 'bg-emerald-400' },
    { time: '1h ago',  text: 'Semantic engine processed 12 new signals', dot: 'bg-purple-400' },
    { time: '3h ago',  text: 'LinkedIn sync: 2 new connections mapped',  dot: 'bg-orange-400' },
    { time: '6h ago',  text: 'Blob buffer: 1 item promoted to memory',   dot: 'bg-emerald-400' },
  ];

  return (
    <PageWrap title="Dashboard" subtitle="Your Identity Prism at a glance" icon={<LayoutDashboard size={16} className="text-[#666]" />}>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Memory Packets"   value="4.2k"  sub="Total indexed"   icon={<Database    size={18} className="text-blue-400" />} />
        <StatCard label="Sync Status"      value="Active" sub="All systems nominal" color="text-emerald-600" icon={<ShieldCheck size={18} className="text-emerald-400" />} />
        <StatCard label="Buffer Queue"     value="3"     sub="Pending review"  icon={<Archive     size={18} className="text-orange-400" />} />
        <StatCard label="Uplink Flux"      value="98.4%" sub="Last 24h"        icon={<Zap         size={18} className="text-blue-400" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div>
          <SectionLabel>Quick Access</SectionLabel>
          <div className="space-y-2">
            {QUICK.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => onNav(id)}
                className="w-full flex items-center gap-4 p-4 bg-white border border-[#EBEBEB] rounded-2xl hover:border-[#CDCDCD] hover:bg-[#FAFAFA] transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0 group-hover:bg-[#EBEBEB] transition-colors">
                  <Icon size={18} className="text-[#555]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{label}</p>
                  <p className="text-[11px] text-[#999] truncate">{desc}</p>
                </div>
                <ChevronRight size={16} className="text-[#CCC] group-hover:text-[#999] transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <SectionLabel>Recent Activity</SectionLabel>
          <div className="bg-white border border-[#EBEBEB] rounded-2xl divide-y divide-[#F5F5F5]">
            {RECENT.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#333]">{r.text}</p>
                </div>
                <span className="text-[11px] text-[#BBB] shrink-0">{r.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer status read-only */}
      <div>
        <SectionLabel>System Layers</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { layer: 'L0', name: 'Intake',     status: 'Active',  color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { layer: 'L1', name: 'Memory',     status: 'Active',  color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { layer: 'L2', name: 'Processing', status: 'Active',  color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { layer: 'L3', name: 'Identity',   status: 'Active',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { layer: 'L4', name: 'Cognitive',  status: 'Standby', color: 'bg-orange-50 text-orange-700 border-orange-100' },
          ].map(l => (
            <div key={l.layer} className="bg-white border border-[#EBEBEB] rounded-xl p-3 text-center">
              <p className="text-[11px] font-bold text-[#999]">{l.layer}</p>
              <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{l.name}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${l.color}`}>
                {l.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageWrap>
  );
};

/* ─── Profile section ───────────────────────────────────────────── */
const ProfileSection: React.FC<{ selectedIndustry: string | null; onSelectIndustry: (s: string | null) => void }> = ({
  selectedIndustry, onSelectIndustry,
}) => (
  <PageWrap title="Profile" subtitle="Your identity, skills and sector map" icon={<User size={16} className="text-[#666]" />}>
    <ProfileHeader />
    <div>
      <SectionLabel>Identity Pillars</SectionLabel>
      <IdentityPillars />
    </div>
    <div>
      <SectionLabel>Sector Map</SectionLabel>
      <IndustryBento selected={selectedIndustry || undefined} onSelect={onSelectIndustry} />
    </div>
    <div>
      <SectionLabel>Published Works</SectionLabel>
      <PublishedWorks />
    </div>
    <div>
      <SectionLabel>Job Pipeline</SectionLabel>
      <JobPipeline />
    </div>
    <div>
      <SectionLabel>Venture Vault</SectionLabel>
      <VentureVault selectedIndustry={selectedIndustry || undefined} />
    </div>
    <div>
      <SectionLabel>Experience Matrix</SectionLabel>
      <ExperienceMatrix selectedIndustry={selectedIndustry || undefined} />
    </div>
  </PageWrap>
);

/* ─── Digital Twin chat ─────────────────────────────────────────── */
const DigitalTwinSection: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    onError: (err) => toast.error('Link failure: ' + (err.message || 'Check connection.')),
  });

  const sendQuery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSubmit(e);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const highlightKeywords = (text: string) => {
    const keywords = ['AI', 'Fintech', 'Identity', 'UX', 'Architecture', 'Prism', 'RAG', 'Vector'];
    const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'));
    return parts.map((part, i) =>
      keywords.some(k => k.toLowerCase() === part.toLowerCase())
        ? <span key={i} className="text-blue-500 font-semibold">{part}</span>
        : part
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col h-full">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
            <Brain size={16} className="text-[#666]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Digital Twin</h1>
            <p className="text-sm text-[#888] mt-0.5">RAG-grounded conversational interface</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[11px] text-[#E11D48] hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors"
          >
            Clear chat
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 min-h-[400px] max-h-[520px] overflow-y-auto custom-scrollbar bg-white border border-[#EBEBEB] rounded-2xl p-6 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-[#F0F0F0] flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-[#888]" />
            </div>
            <p className="text-sm font-semibold text-[#333]">Prism is ready</p>
            <p className="text-[12px] text-[#999] mt-1 max-w-xs">
              Ask anything — your Digital Twin is grounded in your entire memory graph.
            </p>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-blue-50 text-blue-500 border border-blue-100'
                }`}>
                  {m.role === 'user' ? <User size={14} /> : <Brain size={14} />}
                </div>
                <div className={`max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#1A1A1A] text-white rounded-tr-sm'
                      : 'bg-[#F7F7F7] text-[#222] rounded-tl-sm border border-[#EBEBEB]'
                  }`}>
                    {m.role !== 'user' ? highlightKeywords(m.content) : m.content}
                  </div>
                  <span className="text-[10px] text-[#CCC] mt-1 px-1">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                  <Brain size={14} className="text-blue-500" />
                </div>
                <div className="bg-[#F7F7F7] border border-[#EBEBEB] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-[#CCC] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input — inline, NOT fixed/overlapping */}
      <form onSubmit={sendQuery} className="bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-start gap-3 px-4 py-3">
          <Search size={18} className="mt-1 text-[#CCC] shrink-0" />
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && input.trim()) sendQuery(e as any);
              }
            }}
            placeholder="Ask your Digital Twin anything…"
            rows={2}
            className="flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#CCC] focus:outline-none resize-none"
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#F5F5F5] bg-[#FAFAFA]">
          <span className="text-[11px] text-[#BBB]">Shift+Enter for new line</span>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white text-[11px] font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black transition-colors"
          >
            {isLoading ? <RefreshCcw size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
            {isLoading ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ─── Public Showcase ────────────────────────────────────────────── */
const ShowcaseSection: React.FC = () => (
  <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
    <header className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
        <Eye size={16} className="text-[#666]" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Public Showcase</h1>
        <p className="text-sm text-[#888] mt-0.5">Your public-facing identity surfaces</p>
      </div>
    </header>
    <IdentityShowcase />
  </div>
);

/* ─── Memory Vault ───────────────────────────────────────────────── */
const MemorySection: React.FC = () => (
  <PageWrap title="Memory Vault" subtitle="Indexed knowledge packets and embeddings" icon={<Database size={16} className="text-[#666]" />}>
    <MemoryVault />
  </PageWrap>
);

/* ─── Buffer Queue ───────────────────────────────────────────────── */
const BufferSection: React.FC = () => (
  <PageWrap title="Buffer Queue" subtitle="L0 intake — review and promote raw signals" icon={<Archive size={16} className="text-[#666]" />}>
    <BlobBuffer />
  </PageWrap>
);

/* ─── Activity ───────────────────────────────────────────────────── */
const ActivitySection: React.FC = () => (
  <PageWrap title="Activity" subtitle="Incoming signals, intake panel and inspiration feed" icon={<Activity size={16} className="text-[#666]" />}>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionLabel>Cognitive Intake</SectionLabel>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
          <VoiceIngestion />
        </div>
        <SectionLabel>Activity Log</SectionLabel>
        <ActivityLog />
      </div>
      <div>
        <SectionLabel>Inspiration Feed</SectionLabel>
        <InspirationHub />
      </div>
    </div>
    <div>
      <SectionLabel>Neural Connections</SectionLabel>
      <NeuralConnections />
    </div>
  </PageWrap>
);

/* ─── Cognitive Engine ───────────────────────────────────────────── */
const CognitiveSection: React.FC = () => (
  <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
    <header className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
        <Cpu size={16} className="text-[#666]" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Cognitive Engine</h1>
        <p className="text-sm text-[#888] mt-0.5">L4 decision synthesis — Architect · Founder · Operator</p>
      </div>
    </header>
    <CognitiveConsole />
  </div>
);

/* ─── Persona ────────────────────────────────────────────────────── */
const PersonaSection: React.FC = () => {
  const TRAITS = [
    { name: 'Analytical Depth',    score: 0.91, desc: 'Tendency to reason from first principles before acting.' },
    { name: 'Execution Focus',     score: 0.78, desc: 'Bias toward shipping and iterating over prolonged planning.' },
    { name: 'Systems Thinking',    score: 0.95, desc: 'High capacity for holding complex interdependencies.' },
    { name: 'Creative Synthesis',  score: 0.84, desc: 'Ability to connect disparate domains into novel frameworks.' },
    { name: 'Communication Style', score: 0.70, desc: 'Structured, layered explanations with technical precision.' },
    { name: 'Risk Tolerance',      score: 0.65, desc: 'Moderate — prefers calculated bets over speculation.' },
  ];

  const POSITIONING = [
    'Systems Architect', 'RAG Engineer', 'Digital Twin Builder',
    'Venture Strategist', 'AI Product Designer', 'Neural OS Pioneer',
  ];

  const BIO =
    'A systems architect and founder building at the intersection of human identity and machine intelligence. Specializes in RAG-grounded cognitive infrastructure, venture mapping, and AI-native product design.';

  return (
    <PageWrap
      title="Persona"
      subtitle="AI-synthesized behavioral profile and positioning"
      icon={<Sparkles size={16} className="text-[#666]" />}
    >
      {/* Bio */}
      <div>
        <SectionLabel>Synthesized Bio</SectionLabel>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
          <p className="text-sm text-[#333] leading-relaxed">{BIO}</p>
          <button className="mt-3 text-[11px] text-blue-500 font-semibold hover:underline">
            Regenerate with LLM →
          </button>
        </div>
      </div>

      {/* Traits */}
      <div>
        <SectionLabel>Trait Scores</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRAITS.map((t) => (
            <div key={t.name} className="bg-white border border-[#EBEBEB] rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#333]">{t.name}</span>
                <span className="text-[12px] font-bold text-[#1A1A1A]">{Math.round(t.score * 100)}%</span>
              </div>
              <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${t.score * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-[#1A1A1A] rounded-full"
                />
              </div>
              <p className="text-[11px] text-[#999]">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Positioning keywords */}
      <div>
        <SectionLabel>Positioning Keywords</SectionLabel>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
          <div className="flex flex-wrap gap-2">
            {POSITIONING.map((kw) => (
              <span
                key={kw}
                className="px-3 py-1.5 bg-[#F5F5F5] border border-[#E8E8E8] rounded-full text-[12px] font-medium text-[#444]"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Style patterns */}
      <div>
        <SectionLabel>Communication Style Patterns</SectionLabel>
        <div className="space-y-2">
          {[
            { pattern: 'Uses layered analogies when explaining complex systems', freq: 'High' },
            { pattern: 'Prefers numbered frameworks over prose',                freq: 'Medium' },
            { pattern: 'Writes in present tense with active voice',             freq: 'High' },
            { pattern: 'Removes passive voice in final drafts',                 freq: 'Medium' },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-4 bg-white border border-[#EBEBEB] rounded-xl px-4 py-3">
              <div className="flex-1 text-[12px] text-[#333]">{p.pattern}</div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                p.freq === 'High'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-[#F5F5F5] text-[#888] border-[#E8E8E8]'
              }`}>
                {p.freq}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageWrap>
  );
};

/* ─── Integrations & Syncs ───────────────────────────────────────── */
const SyncsSection: React.FC = () => {
  const SYNCS = [
    { name: 'Google Calendar', status: 'Connected', detail: '2 accounts · last synced 5m ago',    color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400' },
    { name: 'GitHub',          status: 'Active',    detail: 'wugweb-git · 14 repos tracked',       color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400' },
    { name: 'LinkedIn',        status: 'Optimised', detail: 'v.1.4.2 · 98% cohesion',              color: 'text-blue-600   bg-blue-50   border-blue-100',    dot: 'bg-blue-400'    },
    { name: 'Twitter/X',       status: 'Syncing',   detail: '72% cohesion · in progress',          color: 'text-orange-600 bg-orange-50 border-orange-100',  dot: 'bg-orange-400 animate-pulse' },
    { name: 'Google Meet',     status: 'Enabled',   detail: 'Primary meeting tool',                color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400' },
    { name: 'Gmail',           status: 'Active',    detail: 'Signal extraction: ON',              color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400' },
    { name: 'Notion',          status: 'Pending',   detail: 'Not configured',                      color: 'text-[#888]     bg-[#F5F5F5] border-[#E8E8E8]',  dot: 'bg-[#CCC]'      },
    { name: 'Zoom Pro',        status: 'Disabled',  detail: 'Toggle to enable',                    color: 'text-[#888]     bg-[#F5F5F5] border-[#E8E8E8]',  dot: 'bg-[#CCC]'      },
  ];

  const EXTERNAL = [
    { label: 'Portfolio',   url: 'wugweb.com',          icon: Globe,    status: 'Live' },
    { label: 'GitHub',      url: 'github.com/wugweb-git', icon: GitBranch, status: 'Active' },
    { label: 'LinkedIn',    url: 'linkedin.com/in/vedanshu', icon: Link2, status: 'Active' },
    { label: 'Vercel',      url: 'vercel.com/wugweb',   icon: TrendingUp, status: 'Deployed' },
  ];

  return (
    <PageWrap title="Integrations & Syncs" subtitle="All external connections and their live status" icon={<Link2 size={16} className="text-[#666]" />}>
      {/* Integration matrix */}
      <IntegrationMatrix />

      {/* Sync status table */}
      <div>
        <SectionLabel>All Sync Statuses</SectionLabel>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl divide-y divide-[#F5F5F5] overflow-hidden">
          {SYNCS.map((s) => (
            <div key={s.name} className="flex items-center gap-4 px-5 py-3.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A]">{s.name}</p>
                <p className="text-[11px] text-[#999] truncate">{s.detail}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* External links */}
      <div>
        <SectionLabel>External Links</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXTERNAL.map((e) => (
            <a
              key={e.label}
              href={`https://${e.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white border border-[#EBEBEB] rounded-2xl px-4 py-3.5 hover:border-[#CDCDCD] hover:bg-[#FAFAFA] transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center group-hover:bg-[#EBEBEB] transition-colors">
                <e.icon size={16} className="text-[#555]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A]">{e.label}</p>
                <p className="text-[11px] text-[#999] truncate">{e.url}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-emerald-600">{e.status}</span>
                <ArrowUpRight size={14} className="text-[#CCC] group-hover:text-[#999]" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </PageWrap>
  );
};

/* ─── Settings ───────────────────────────────────────────────────── */
const SettingsSection: React.FC = () => {
  const L3_CONFIG = [
    { key: 'RAG Mode',             value: 'MMR (Maximal Marginal Relevance)',  type: 'string' },
    { key: 'Fetch K',              value: '15',      type: 'number' },
    { key: 'Lambda (diversity)',   value: '0.3',     type: 'number' },
    { key: 'Temperature',         value: '0.75',    type: 'number' },
    { key: 'Model',               value: 'gpt-4-turbo-preview', type: 'string' },
    { key: 'Embedding Model',     value: 'text-embedding-3-small', type: 'string' },
    { key: 'Chunk Size',          value: '800',     type: 'number' },
    { key: 'Chunk Overlap',       value: '100',     type: 'number' },
    { key: 'Test Run ID',         value: 'PROD',    type: 'string' },
  ];

  return (
    <PageWrap title="Settings" subtitle="Account preferences and layer configuration" icon={<Settings size={16} className="text-[#666]" />}>
      {/* Profile settings */}
      <div>
        <SectionLabel>Profile</SectionLabel>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl divide-y divide-[#F5F5F5]">
          {[
            { label: 'Display Name', value: 'Vedanshu Srivastava' },
            { label: 'Handle',       value: '@vedanshu' },
            { label: 'Email',        value: 'vedanshu@wugweb.com' },
            { label: 'Timezone',     value: 'Asia/Kolkata (IST)' },
            { label: 'Language',     value: 'English (US)' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-[#666]">{row.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#1A1A1A]">{row.value}</span>
                <button className="text-[11px] text-blue-500 hover:underline">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div>
        <SectionLabel>Notifications</SectionLabel>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl divide-y divide-[#F5F5F5]">
          {[
            { label: 'Memory sync alerts',     on: true },
            { label: 'Cognitive decisions',    on: true },
            { label: 'Buffer queue full',      on: true },
            { label: 'New connections synced', on: false },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-[#333]">{row.label}</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${row.on ? 'bg-[#1A1A1A]' : 'bg-[#E0E0E0]'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${row.on ? 'translate-x-4' : ''}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layer 3 config — read-only */}
      <div>
        <SectionLabel>Layer 3 Configuration</SectionLabel>
        <div className="flex items-center gap-2 mb-3 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
          <Lock size={13} className="text-[#D97706] shrink-0" />
          <p className="text-[11px] text-[#92400E]">This configuration is read-only. Changes must be deployed via code.</p>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl divide-y divide-[#F5F5F5]">
          {L3_CONFIG.map((row) => (
            <div key={row.key} className="flex items-center justify-between px-5 py-3 font-mono">
              <span className="text-[12px] text-[#666]">{row.key}</span>
              <span className={`text-[12px] font-semibold ${row.type === 'number' ? 'text-blue-600' : 'text-[#1A1A1A]'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <SectionLabel>Danger Zone</SectionLabel>
        <div className="bg-white border border-red-100 rounded-2xl divide-y divide-red-50">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Clear all memory</p>
              <p className="text-[11px] text-[#999] mt-0.5">Permanently delete all indexed packets</p>
            </div>
            <button className="text-[11px] font-semibold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Clear memory
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Reset Digital Twin</p>
              <p className="text-[11px] text-[#999] mt-0.5">Wipe all chat history and re-anchor</p>
            </div>
            <button className="text-[11px] font-semibold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Reset twin
            </button>
          </div>
        </div>
      </div>
    </PageWrap>
  );
};

/* ─── Root ───────────────────────────────────────────────────────── */
export default function IdentityPrismWorkspace() {
  const [section, setSection] = useState<Section>('overview');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const renderSection = () => {
    switch (section) {
      case 'overview':  return <Overview onNav={setSection} />;
      case 'profile':   return <ProfileSection selectedIndustry={selectedIndustry} onSelectIndustry={setSelectedIndustry} />;
      case 'twin':      return <DigitalTwinSection />;
      case 'showcase':  return <ShowcaseSection />;
      case 'memory':    return <MemorySection />;
      case 'buffer':    return <BufferSection />;
      case 'activity':  return <ActivitySection />;
      case 'cognitive': return <CognitiveSection />;
      case 'persona':   return <PersonaSection />;
      case 'syncs':     return <SyncsSection />;
      case 'settings':  return <SettingsSection />;
      default:          return <Overview onNav={setSection} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F8F6] overflow-hidden">
      <ToastContainer
        position="bottom-right"
        toastClassName="!bg-white !border !border-[#E8E8E8] !rounded-2xl !shadow-lg !text-[#1A1A1A] !text-sm"
      />

      {/* Left sidebar */}
      <Sidebar current={section} onChange={setSection} />

      {/* Main content — offset by sidebar width */}
      <main className="ml-60 flex-1 overflow-y-auto custom-scrollbar bg-[#F8F8F6]">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Enhancement Hub (floating CTA) */}
      <EnhancementHub />
    </div>
  );
}
