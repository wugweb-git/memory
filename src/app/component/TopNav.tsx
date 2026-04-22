"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Upload, Plus, X, Command,
  LayoutDashboard, User, Brain, Eye, Database, Archive,
  Activity, Cpu, Sparkles, Link2, Settings, ChevronRight,
  FileText, Globe, Zap
} from 'lucide-react';
import { Section } from './Sidebar';

/* ── section label map ─────────────────────────────────────── */
const SECTION_META: Record<Section, { label: string; icon: any; desc: string }> = {
  overview:  { label: 'Dashboard',       icon: LayoutDashboard, desc: 'System overview' },
  profile:   { label: 'Profile',         icon: User,            desc: 'Identity & works' },
  twin:      { label: 'Digital Twin',    icon: Brain,           desc: 'RAG chat interface' },
  showcase:  { label: 'Public Showcase', icon: Eye,             desc: 'Identity surfaces' },
  memory:    { label: 'Memory Vault',    icon: Database,        desc: 'L1 indexed packets' },
  buffer:    { label: 'Buffer Queue',    icon: Archive,         desc: 'L0 intake review' },
  activity:  { label: 'Activity',        icon: Activity,        desc: 'Signals & feed' },
  cognitive: { label: 'Cognitive Engine',icon: Cpu,             desc: 'L4 decisions' },
  persona:   { label: 'Persona',         icon: Sparkles,        desc: 'Behavioral profile' },
  syncs:     { label: 'Integrations',    icon: Link2,           desc: 'External connections' },
  settings:  { label: 'Settings',        icon: Settings,        desc: 'Preferences & config' },
};

/* ── quick-add command palette ─────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Upload document to memory', icon: Upload,   hint: '⌘U', action: 'upload' },
  { label: 'New voice ingestion',       icon: Zap,      hint: '⌘V', action: 'voice' },
  { label: 'Add knowledge link',        icon: Globe,    hint: '⌘L', action: 'link' },
  { label: 'Open Digital Twin',         icon: Brain,    hint: '⌘T', action: 'twin' },
  { label: 'Cognitive Decision Sync',   icon: Cpu,      hint: '⌘D', action: 'cognitive' },
];

interface TopNavProps {
  current: Section;
  onChange: (s: Section) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ current, onChange }) => {
  const [searchOpen, setSearchOpen]     = useState(false);
  const [paletteOpen, setPaletteOpen]   = useState(false);
  const [query, setQuery]               = useState('');
  const [notifications, setNotifications] = useState(3);

  const meta = SECTION_META[current];
  const Icon = meta.icon;

  /* filter actions by query */
  const filtered = QUICK_ACTIONS.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleAction = (action: string) => {
    setPaletteOpen(false);
    setQuery('');
    if (action === 'twin')      onChange('twin');
    if (action === 'cognitive') onChange('cognitive');
    if (action === 'upload')    onChange('memory');
  };

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-60 right-0 h-14 z-40 bg-white/80 backdrop-blur-xl border-b border-[#EBEBEB] flex items-center justify-between px-6">
        {/* breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
            <Icon size={15} className="text-[#555]" />
          </div>
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-[#1A1A1A] block truncate leading-tight">
              {meta.label}
            </span>
            <span className="text-[10px] text-[#999] hidden sm:block leading-tight">
              {meta.desc}
            </span>
          </div>
        </div>

        {/* centre — search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#F7F7F7] border border-[#EBEBEB] rounded-xl text-[12px] text-[#BBB] hover:border-[#CDCDCD] hover:bg-[#F0F0F0] transition-all w-56 lg:w-72"
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="text-[10px] bg-[#E8E8E8] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </button>

        {/* right actions */}
        <div className="flex items-center gap-2">
          {/* mobile search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-[#F5F5F5] transition-colors text-[#666]"
          >
            <Search size={18} />
          </button>

          {/* quick add */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white rounded-xl text-[11px] font-semibold hover:bg-black transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span className="hidden sm:block">New</span>
          </button>

          {/* notifications */}
          <button className="relative p-2 rounded-xl hover:bg-[#F5F5F5] transition-colors text-[#666]">
            <Bell size={18} />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>

          {/* user */}
          <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-[#F5F5F5] transition-colors">
            <img
              src="https://ui-avatars.com/api/?name=VS&size=64&background=E8E8E8&color=1A1A1A&bold=true"
              alt="User"
              className="w-7 h-7 rounded-full"
            />
          </button>
        </div>
      </header>

      {/* ── Search / Command palette ──────────────────────────────── */}
      <AnimatePresence>
        {(searchOpen || paletteOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-start justify-center pt-[15vh] px-4"
            onClick={() => { setSearchOpen(false); setPaletteOpen(false); setQuery(''); }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.96, y: -8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: -8 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#EBEBEB]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* search input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F5F5F5]">
                <Search size={18} className="text-[#999] shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sections, actions, memory…"
                  className="flex-1 text-[14px] text-[#1A1A1A] placeholder:text-[#CCC] focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-[#CCC] hover:text-[#999]">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* actions list */}
              <div className="py-2 max-h-80 overflow-y-auto">
                {/* navigate sections */}
                {!query && (
                  <div className="px-4 pb-1">
                    <p className="text-[10px] font-semibold text-[#BBB] uppercase tracking-widest mb-1.5 px-1">Navigate</p>
                    {(Object.entries(SECTION_META) as [Section, typeof SECTION_META[Section]][]).map(([id, m]) => {
                      const SIcon = m.icon;
                      return (
                        <button
                          key={id}
                          onClick={() => { onChange(id); setSearchOpen(false); setPaletteOpen(false); setQuery(''); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F7F7F7] transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
                            <SIcon size={14} className="text-[#666]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-medium text-[#1A1A1A]">{m.label}</p>
                            <p className="text-[11px] text-[#999]">{m.desc}</p>
                          </div>
                          <ChevronRight size={14} className="text-[#CCC]" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* quick actions */}
                <div className="px-4 pt-2 pb-2">
                  {!query && <p className="text-[10px] font-semibold text-[#BBB] uppercase tracking-widest mb-1.5 px-1">Quick Actions</p>}
                  {filtered.map((a) => (
                    <button
                      key={a.action}
                      onClick={() => handleAction(a.action)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F7F7F7] transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
                        <a.icon size={14} className="text-[#666]" />
                      </div>
                      <span className="flex-1 text-[13px] font-medium text-[#1A1A1A]">{a.label}</span>
                      <kbd className="text-[10px] bg-[#F0F0F0] px-1.5 py-0.5 rounded font-mono text-[#888]">{a.hint}</kbd>
                    </button>
                  ))}
                  {query && filtered.length === 0 && (
                    <p className="text-[13px] text-[#BBB] text-center py-6">No results for "{query}"</p>
                  )}
                </div>
              </div>

              <div className="px-5 py-2.5 border-t border-[#F5F5F5] flex items-center gap-4 text-[10px] text-[#CCC]">
                <span>↑↓ navigate</span>
                <span>⏎ select</span>
                <span>esc close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
