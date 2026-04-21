"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, User, Brain, Eye, Database, Archive,
  Activity, Cpu, Sparkles, Link2, Settings, ChevronRight,
  Zap, ShieldCheck, Command, LogOut, Bell
} from 'lucide-react';

export type Section =
  | 'overview'
  | 'profile'
  | 'twin'
  | 'showcase'
  | 'memory'
  | 'buffer'
  | 'activity'
  | 'cognitive'
  | 'persona'
  | 'syncs'
  | 'settings';

interface SidebarProps {
  current: Section;
  onChange: (s: Section) => void;
}

const NAV = [
  {
    group: 'Identity',
    items: [
      { id: 'overview',  label: 'Dashboard',      icon: LayoutDashboard },
      { id: 'profile',   label: 'Profile',         icon: User },
      { id: 'twin',      label: 'Digital Twin',    icon: Brain },
      { id: 'showcase',  label: 'Public Showcase', icon: Eye },
    ],
  },
  {
    group: 'Data',
    items: [
      { id: 'memory',    label: 'Memory Vault',    icon: Database },
      { id: 'buffer',    label: 'Buffer Queue',    icon: Archive },
      { id: 'activity',  label: 'Activity',        icon: Activity },
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
      { id: 'syncs',     label: 'Integrations',    icon: Link2 },
      { id: 'settings',  label: 'Settings',        icon: Settings },
    ],
  },
] as const;

const STATS = [
  { label: 'Uplink',    value: '98.4%',   icon: Zap,        color: 'text-blue-500' },
  { label: 'Integrity', value: 'Nominal', icon: ShieldCheck, color: 'text-emerald-500' },
];

export const Sidebar: React.FC<SidebarProps> = ({ current, onChange }) => {
  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-[#EBEBEB] flex flex-col z-50 select-none">
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-5 border-b border-[#EBEBEB] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
          <Command size={14} className="text-white" />
        </div>
        <span className="text-[13px] font-bold text-[#1A1A1A] tracking-tight">Identity Prism</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map((group) => (
          <div key={group.group} className="mb-5">
            <p className="text-[10px] font-semibold text-[#B0B0B0] uppercase tracking-widest px-3 mb-1.5">
              {group.group}
            </p>
            {group.items.map(({ id, label, icon: Icon }) => {
              const active = current === id;
              return (
                <button
                  key={id}
                  onClick={() => onChange(id as Section)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                    active
                      ? 'bg-[#F0F0F0] text-[#1A1A1A]'
                      : 'text-[#666] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]'
                  }`}
                >
                  <Icon
                    size={16}
                    className={active ? 'text-[#1A1A1A]' : 'text-[#999]'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {label}
                  {active && (
                    <ChevronRight size={14} className="ml-auto text-[#999]" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System stats */}
      <div className="px-4 py-3 border-t border-[#EBEBEB] space-y-2.5">
        {STATS.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <s.icon size={13} className={s.color} />
            <span className="text-[11px] text-[#999] flex-1">{s.label}</span>
            <span className="text-[11px] font-semibold text-[#444]">{s.value}</span>
          </div>
        ))}
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#EBEBEB]">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F7F7F7] transition-colors cursor-pointer">
          <img
            src="https://ui-avatars.com/api/?name=VS&size=64&background=E8E8E8&color=1A1A1A&bold=true"
            alt="User"
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#1A1A1A] truncate">Vedanshu S.</p>
            <p className="text-[10px] text-[#999] truncate">Master Prism</p>
          </div>
          <button className="p-1 text-[#CCC] hover:text-[#999] transition-colors">
            <Bell size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
