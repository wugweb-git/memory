"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Upload, Plus, X, Command,
  LayoutDashboard, User, Brain, Eye, Database, Archive,
  Activity, Cpu, Sparkles, Link2, Settings, ChevronRight,
  Globe, Zap, Menu
} from 'lucide-react';
import { Section } from './Sidebar';

const SECTION_META: Record<Section, { label: string; icon: any; desc: string }> = {
  overview:  { label: 'Dashboard',        icon: LayoutDashboard, desc: 'System overview' },
  profile:   { label: 'Profile',          icon: User,            desc: 'Identity & works' },
  twin:      { label: 'Digital Twin',     icon: Brain,           desc: 'RAG chat interface' },
  showcase:  { label: 'Public Showcase',  icon: Eye,             desc: 'Identity surfaces' },
  memory:    { label: 'Memory Vault',     icon: Database,        desc: 'L1 indexed packets' },
  buffer:    { label: 'Buffer Queue',     icon: Archive,         desc: 'L0 intake review' },
  activity:  { label: 'Activity',         icon: Activity,        desc: 'Signals & feed' },
  cognitive: { label: 'Cognitive Engine', icon: Cpu,             desc: 'L4 decisions' },
  persona:   { label: 'Persona',          icon: Sparkles,        desc: 'Behavioral profile' },
  syncs:     { label: 'Integrations',     icon: Link2,           desc: 'External connections' },
  settings:  { label: 'Settings',         icon: Settings,        desc: 'Preferences & config' },
};

const QUICK_ACTIONS = [
  { label: 'Upload document to memory', icon: Upload,  hint: '⌘U', action: 'upload' },
  { label: 'New voice ingestion',       icon: Zap,     hint: '⌘V', action: 'voice' },
  { label: 'Add knowledge link',        icon: Globe,   hint: '⌘L', action: 'link' },
  { label: 'Open Digital Twin',         icon: Brain,   hint: '⌘T', action: 'twin' },
  { label: 'Cognitive Decision Sync',   icon: Cpu,     hint: '⌘D', action: 'cognitive' },
];

interface TopNavProps {
  current: Section;
  onChange: (s: Section) => void;
  onMenuToggle?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ current, onChange, onMenuToggle }) => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const notifications = 3;

  /* ⌘K global shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const meta = SECTION_META[current];
  const Icon = meta.icon;

  const filtered = [
    ...Object.entries(SECTION_META).map(([id, m]) => ({
      type: 'nav' as const, id: id as Section, ...m,
    })),
    ...QUICK_ACTIONS.map(a => ({ type: 'action' as const, ...a })),
  ].filter(item =>
    !query ||
    ('label' in item && item.label.toLowerCase().includes(query.toLowerCase()))
  );

  const close = () => { setPaletteOpen(false); setQuery(''); };

  const handleItem = (item: any) => {
    if (item.type === 'nav') onChange(item.id);
    else {
      if (item.action === 'upload' || item.action === 'voice') onChange('memory');
      if (item.action === 'twin') onChange('twin');
      if (item.action === 'cognitive') onChange('cognitive');
    }
    close();
  };

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────── */}
      <header
        className="
          fixed top-0 right-0 h-14 z-40
          left-0 md:left-60
          glass-panel border-b border-border-secondary
          flex items-center justify-between px-4 md:px-6
        "
      >
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {/* hamburger — mobile only */}
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-1 rounded-xl hover:bg-secondary transition-colors text-text-tertiary"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="w-7 h-7 rounded-xl bg-secondary border border-border-primary flex items-center justify-center shrink-0">
            <Icon size={14} className="text-text-tertiary" />
          </div>
          <div className="min-w-0">
            <span className="text-[13px] font-bold text-text-primary block truncate leading-tight">
              {meta.label}
            </span>
            <span className="text-[10px] text-text-tertiary hidden sm:block leading-tight font-mono">
              {meta.desc}
            </span>
          </div>
        </div>

        {/* Centre: search — desktop */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden md:flex items-center gap-3 px-4 py-2 bg-secondary/60 border border-border-secondary rounded-2xl text-[12px] text-text-disabled hover:border-border-primary hover:bg-secondary transition-all w-56 lg:w-72"
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="text-[9px] bg-tertiary px-1.5 py-0.5 rounded font-mono text-text-disabled">⌘K</kbd>
        </button>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* search icon — mobile */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-secondary transition-colors text-text-tertiary"
          >
            <Search size={18} />
          </button>

          {/* New */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-text-primary text-bg-primary rounded-xl text-[11px] font-bold hover:bg-accent-high transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span className="hidden sm:block">New</span>
          </button>

          {/* notifications */}
          <button className="relative p-2 rounded-xl hover:bg-secondary transition-colors text-text-tertiary">
            <Bell size={17} />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-accent rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>

          {/* user */}
          <button className="flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-xl hover:bg-secondary transition-colors">
            <img
              src="https://ui-avatars.com/api/?name=VS&size=64&background=E8E8E8&color=1A1A1A&bold=true"
              alt="User avatar"
              className="w-7 h-7 rounded-full border border-border-primary"
            />
          </button>
        </div>
      </header>

      {/* ── Command palette ────────────────────────────────────── */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4"
            onClick={close}
          >
            <div className="absolute inset-0 bg-text-primary/20 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.96, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: -10 }}
              className="relative w-full max-w-lg glass-panel rounded-[2rem] shadow-3xl overflow-hidden border border-border-secondary"
              onClick={e => e.stopPropagation()}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border-secondary">
                <Search size={17} className="text-text-tertiary shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search sections, actions, memory…"
                  className="flex-1 text-sm text-text-primary placeholder:text-text-disabled bg-transparent focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-text-disabled hover:text-text-tertiary">
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="py-2 max-h-[55vh] overflow-y-auto custom-scrollbar">
                {!query && (
                  <p className="text-[10px] font-black text-text-disabled uppercase tracking-[0.3em] px-5 py-2">
                    Navigate & Actions
                  </p>
                )}
                {filtered.length === 0 ? (
                  <p className="text-sm text-text-tertiary text-center py-8">No results for "{query}"</p>
                ) : (
                  filtered.map((item, i) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleItem(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-xl bg-secondary border border-border-primary flex items-center justify-center shrink-0">
                          <ItemIcon size={15} className="text-text-tertiary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{item.label}</p>
                          {'desc' in item && (
                            <p className="text-[11px] text-text-tertiary truncate">{item.desc}</p>
                          )}
                        </div>
                        {'hint' in item && (
                          <kbd className="text-[9px] bg-secondary px-1.5 py-0.5 rounded font-mono text-text-disabled shrink-0">
                            {item.hint}
                          </kbd>
                        )}
                        <ChevronRight size={13} className="text-text-disabled shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-2.5 border-t border-border-secondary flex items-center gap-4 text-[10px] text-text-disabled font-mono">
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
