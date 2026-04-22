"use client";
import React from 'react';
import {
  LayoutDashboard, Brain, Database, Cpu, Settings, Archive,
  User, Eye, Activity, Sparkles, Link2
} from 'lucide-react';
import { Section } from './Sidebar';

/* Core 6 tabs shown in mobile dock (most used) */
const DOCK_TABS: Array<{ id: Section; label: string; icon: any }> = [
  { id: 'overview',  label: 'Home',    icon: LayoutDashboard },
  { id: 'memory',    label: 'Memory',  icon: Database },
  { id: 'twin',      label: 'Twin',    icon: Brain },
  { id: 'activity',  label: 'Activity',icon: Activity },
  { id: 'cognitive', label: 'Cogn.',   icon: Cpu },
  { id: 'settings',  label: 'More',    icon: Settings },
];

interface MobileNavProps {
  current: Section;
  onChange: (s: Section) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ current, onChange }) => {
  return (
    /* Mobile only — hidden on desktop */
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-navbar"
      aria-label="Mobile navigation"
    >
      {/* Frosted glass dock */}
      <div className="glass-panel border-t border-border-secondary shadow-[0_-8px_32px_rgba(0,0,0,0.06)] px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
        <div className="grid grid-cols-6 gap-0.5">
          {DOCK_TABS.map(({ id, label, icon: Icon }) => {
            const active = current === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl transition-all duration-200 ${
                  active
                    ? 'text-text-primary'
                    : 'text-text-disabled hover:text-text-tertiary'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  active ? 'bg-text-primary shadow-sm' : 'bg-transparent'
                }`}>
                  <Icon
                    size={17}
                    className={active ? 'text-bg-primary' : 'text-text-disabled'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span className={`text-[9px] font-bold leading-none tracking-wide ${
                  active ? 'text-text-primary' : 'text-text-disabled'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
