"use client";
import React from 'react';
import { 
  ShieldCheck, Database, Activity, 
  Database as VaultIcon, Link as LinkIcon,
  FileEdit, Briefcase, Zap, LucideIcon,
  Terminal, Cpu, Sparkles
} from 'lucide-react';

export type ViewMode = 'dashboard' | 'vault' | 'publications' | 'inspiration' | 'jobs' | 'activity' | 'connections';

interface StatProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface StatusHUDProps {
  stats: StatProps[];
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const StatusHUD = ({ stats, currentView, onViewChange }: StatusHUDProps) => {
  const tabs = [
    { id: 'dashboard', label: 'Console', icon: Terminal },
    { id: 'vault', label: 'Venture Vault', icon: VaultIcon },
    { id: 'publications', label: 'Works Hub', icon: FileEdit },
    { id: 'inspiration', label: 'Inspiration', icon: Sparkles },
    { id: 'jobs', label: 'Job Agent', icon: Briefcase },
    { id: 'activity', label: 'Signals', icon: Zap },
    { id: 'connections', label: 'Neural', icon: LinkIcon },
  ];

  return (
    <header role="banner" className="sticky top-0 h-16 border-b border-primary bg-primary/90 backdrop-blur-3xl flex items-center justify-between px-[var(--space-page)] z-[60] shrink-0">
      <div className="flex items-center gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
            <Cpu size={16} className="text-accent" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-text-primary">Prism Core</span>
            <span className="text-xs font-mono text-text-tertiary flex items-center gap-1.5">
              <span className="w-1 h-1 bg-success rounded-full inline-block" />Status: Nominal
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav role="tablist" aria-label="Primary navigation" className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-secondary border border-primary">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={currentView === tab.id}
              aria-current={currentView === tab.id ? 'page' : undefined}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onViewChange(tab.id as ViewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all focus-ring ${
                currentView === tab.id 
                  ? 'bg-accent/10 text-accent border border-accent/20' 
                  : 'text-text-tertiary hover:text-text-primary hover:bg-tertiary'
              }`}
            >
              <tab.icon size={13} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Stats */}
      <div className="hidden xl:flex items-center gap-8">
        <div className="flex items-center gap-6 pr-6 border-r border-primary">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-semibold tracking-wide text-text-tertiary flex items-center gap-1.5">
                <stat.icon size={10} className={stat.color} aria-hidden="true" /> {stat.label}
              </span>
              <span className="text-sm font-mono font-bold text-text-secondary">{stat.value}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
           <button className="w-8 h-8 rounded-lg bg-secondary border border-primary flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors focus-ring" aria-label="Search">
              <Activity size={14} aria-hidden="true" />
           </button>
        </div>
      </div>
    </header>
  );
};
