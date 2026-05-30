"use client";
import React from 'react';
import {
  LayoutDashboard, User, Brain, Eye, Database, Archive,
  Activity, Cpu, Sparkles, Link2, Settings, ChevronRight,
  Zap, ShieldCheck, Command, Bell
} from 'lucide-react';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { APP_BRAND, WORKSPACE_NAV, SIDEBAR_STATS } from '@/config/ui-content';

export type Section =
  | 'overview' | 'profile' | 'twin' | 'showcase'
  | 'memory' | 'buffer' | 'activity'
  | 'cognitive' | 'persona' | 'syncs' | 'settings';

interface SidebarProps {
  current: Section;
  onChange: (s: Section) => void;
  /** When true, show as mobile drawer (not hidden below md) */
  mobileOpen?: boolean;
  onClose?: () => void;
}

const STATS = SIDEBAR_STATS.map((s, i) => ({
  ...s,
  icon: i === 0 ? Zap : ShieldCheck,
  color: s.colorClass,
}));

export const Sidebar: React.FC<SidebarProps> = ({ current, onChange, mobileOpen, onClose }) => {
  const visibility = mobileOpen
    ? 'flex md:flex'
    : 'hidden md:flex';

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-text-primary/30 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}
    <aside className={`${visibility} fixed top-0 left-0 h-screen w-60 flex-col z-50 select-none
                      bg-bg-elevated border-r border-border-secondary shadow-[1px_0_12px_rgba(0,0,0,0.04)]`}>
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-5 border-b border-border-secondary shrink-0">
        <div className="w-7 h-7 rounded-xl bg-text-primary flex items-center justify-center shadow-lg">
          <Command size={14} className="text-bg-primary" />
        </div>
        <div>
          <span className="text-[13px] font-black text-text-primary tracking-tight uppercase italic">{APP_BRAND.name}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Active</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {WORKSPACE_NAV.map((group) => (
          <div key={group.group} className="mb-5">
            <p className="text-[9px] font-black text-text-disabled uppercase tracking-[0.3em] px-3 mb-1.5">
              {group.group}
            </p>
            {group.items.map(({ id, label, icon: Icon }) => {
              const active = current === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    onChange(id as Section);
                    onClose?.();
                  }}
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
            src={avatarFallbackUrl(64)}
            alt={IDENTITY_CONFIG.DISPLAY_NAME}
            className="w-8 h-8 rounded-full border border-border-primary"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-text-primary truncate">{IDENTITY_CONFIG.DISPLAY_NAME}</p>
            <p className="text-[10px] text-text-tertiary truncate">{IDENTITY_CONFIG.ROLE}</p>
          </div>
          <button className="p-1 text-text-disabled hover:text-accent transition-colors">
            <Bell size={14} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
