"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Brain, ShieldCheck, Layers, 
  Activity, Database, Terminal, User, LucideIcon
} from 'lucide-react';

export type ViewMode = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

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

export const StatusHUD: React.FC<StatusHUDProps> = ({ stats, currentView, onViewChange }) => {
  const tabs = [
    { id: 'L0', label: 'GENESIS', icon: Activity, detail: 'Intake' },
    { id: 'L1', label: 'MEMORY', icon: Database, detail: 'Vault' },
    { id: 'L2', label: 'LOGIC', icon: Terminal, detail: 'Processing' },
    { id: 'L3', label: 'IDENTITY', icon: User, detail: 'Synthesis' },
    { id: 'L4', label: 'COGNITIVE', icon: Brain, detail: 'Decision' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-[var(--space-page)] pt-6 pointer-events-none">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-auto">
        
        {/* Layer Toggle: Tactile Matrix */}
        <nav className="glass-panel p-1.5 rounded-[1.5rem] flex items-center gap-1 shadow-xl border-border-primary">
          {tabs.map((tab) => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id as ViewMode)}
                className={`
                  relative flex items-center gap-3 px-4 md:px-6 py-2 md:py-2.5 rounded-2xl transition-all duration-500 group
                  ${isActive ? 'text-bg-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-black/[0.02]'}
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-tab"
                    className="absolute inset-0 bg-accent-high rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon size={16} className={`relative z-10 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <div className="relative z-10 flex flex-col items-start leading-none">
                   <span className="text-[10px] font-black tracking-[0.1em]">{tab.label}</span>
                   <span className={`text-[8px] font-bold opacity-50 uppercase tracking-widest mt-0.5 ${isActive ? 'text-bg-primary/60' : ''}`}>{tab.detail}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Global Matrix Stats */}
        <div className="hidden lg:flex items-center gap-6 glass-panel px-8 py-3 rounded-full border-border-secondary shadow-lg">
          {stats.map((stat, idx) => (
            <div key={stat.label} className="flex items-center gap-4">
              {idx > 0 && <div className="w-px h-6 bg-border-secondary mx-2" />}
              <stat.icon size={14} className={stat.color} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-text-tertiary tracking-[0.2em] uppercase leading-none">{stat.label}</span>
                <span className="text-xs font-bold text-text-primary mt-1">{stat.value}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 px-4 py-1.5 bg-success/5 border border-success/20 rounded-full ml-4">
             <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
             <span className="text-[9px] font-black text-success tracking-widest uppercase">SYNC_NOMINAL</span>
          </div>
        </div>

        {/* Brand System Identifier */}
        <div className="flex items-center gap-4 glass-panel pl-6 pr-2 py-2 rounded-2xl border-white/[0.05] shadow-lg">
          <div className="flex flex-col items-end leading-none">
             <span className="text-[10px] font-black text-text-primary tracking-widest">PRISM_v4.2</span>
             <span className="text-[8px] font-bold text-accent tracking-[0.3em] uppercase mt-1">Status: Active</span>
          </div>
          <div className="p-2.5 rounded-xl bg-accent-high text-bg-primary shadow-lg">
             <Layers size={18} />
          </div>
        </div>

      </div>
    </header>
  );
};
