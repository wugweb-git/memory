"use client";
import React from 'react';
import {
  LayoutDashboard, User, Brain, Eye, Database, Archive,
  Activity, Cpu, Sparkles, Link2, Settings, ChevronRight,
  Zap, ShieldCheck, Command, Bell
} from 'lucide-react';

export type Section =
  | 'overview' | 'profile' | 'twin' | 'showcase'
  | 'memory' | 'buffer' | 'activity'
  | 'cognitive' | 'persona' | 'syncs' | 'settings';

interface SidebarProps {
  current: Section;
  onChange: (s: Section) => void;
}

const NAV = [
  {
    group: 'Identity',
    items: [
      { id: 'overview',  label: 'Dashboard',       icon: LayoutDashboard },
      { id: 'profile',   label: 'Profile',          icon: User },
      { id: 'twin',      label: 'Digital Twin',     icon: Brain },
      { id: 'showcase',  label: 'Public Showcase',  icon: Eye },
    ],
  },
  {
    group: 'Data',
    items: [
      { id: 'memory',    label: 'Memory Vault',     icon: Database },
      { id: 'buffer',    label: 'Buffer Queue',     icon: Archive },
      { id: 'activity',  label: 'Activity',         icon: Activity },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { id: 'cognitive', label: 'Cognitive Engine', icon: Cpu },
      { id: 'persona',   label: 'Persona',          icon: Sparkles },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'syncs',     label: 'Integrations',     icon: Link2 },
      { id: 'settings',  label: 'Settings',         icon: Settings },
    ],
  },
] as const;

const STATS = [
  { label: 'Uplink',    value: '98.4%',   icon: Zap,         color: 'text-accent' },
  { label: 'Integrity', value: 'Nominal', icon: ShieldCheck, color: 'text-success' },
];

export const Sidebar: React.FC<SidebarProps> = ({ current, onChange }) => {
  return (
    /* Desktop only — hidden on mobile */
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-60 flex-col z-50 select-none
                      bg-bg-elevated border-r border-border-secondary shadow-[1px_0_12px_rgba(0,0,0,0.04)]">
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-5 border-b border-border-secondary shrink-0">
        <div className="w-7 h-7 rounded-xl bg-text-primary flex items-center justify-center shadow-lg">
          <Command size={14} className="text-bg-primary" />
        </div>
        <div>
          <span className="text-[13px] font-black text-text-primary tracking-tight uppercase italic">Identity Prism</span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Active</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {NAV.map((group) => (
          <div key={group.group} className="mb-5">
            <p className="text-[9px] font-black text-text-disabled uppercase tracking-[0.3em] px-3 mb-1.5">
              {group.group}
            </p>
            {group.items.map(({ id, label, icon: Icon }) => {
              const active = current === id;
              return (
                <button
                  key={id}
                  onClick={() => onChange(id as Section)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                    active
                      ? 'bg-accent-high text-bg-primary shadow-sm'
                      : 'text-text-tertiary hover:bg-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon
                    size={16}
                    className={active ? 'text-bg-primary' : 'text-text-disabled'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className="flex-1 text-left leading-none">{label}</span>
                  {active && (
                    <ChevronRight size={13} className="text-bg-primary/60" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System stats */}
      <div className="px-4 py-3 border-t border-border-secondary space-y-2">
        {STATS.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <s.icon size={12} className={s.color} />
            <span className="text-[11px] text-text-disabled flex-1 font-mono">{s.label}</span>
            <span className="text-[11px] font-bold text-text-secondary font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      {/* User row */}
      <div className="px-3 py-3 border-t border-border-secondary">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-secondary transition-colors cursor-pointer">
          <img
            src="https://ui-avatars.com/api/?name=VS&size=64&background=E8E8E8&color=1A1A1A&bold=true"
            alt="User"
            className="w-8 h-8 rounded-full border border-border-primary"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-text-primary truncate">Vedanshu S.</p>
            <p className="text-[10px] text-text-tertiary truncate">Master Prism</p>
          </div>
          <button className="p-1 text-text-disabled hover:text-accent transition-colors">
            <Bell size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
