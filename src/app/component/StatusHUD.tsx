"use client";
import React from 'react';
import { 
  ShieldCheck, Database, Activity, LayoutDashboard, 
  Database as VaultIcon, Link as LinkIcon, History, 
  FileEdit, Briefcase, Zap, LucideIcon, Search, 
  Settings, User, Power, Terminal, Cpu, Sparkles
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

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
    { id: 'inspiration', label: 'Inspiration', icon: History },
    { id: 'jobs', label: 'Job Agent', icon: Briefcase },
    { id: 'activity', label: 'Signals', icon: Zap },
    { id: 'connections', label: 'Neural', icon: LinkIcon },
  ];

  return (
    <header className="sticky top-0 h-24 border-b border-white/[0.06] bg-[#030303]/80 backdrop-blur-3xl flex items-center justify-between px-10 z-[60] shrink-0">
      <div className="flex items-center gap-16">
        {/* System Core Indicator */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
            <Cpu size={20} className="text-[#00E5FF] animate-pulse" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className={`text-[11px] font-black tracking-[0.3em] uppercase text-white ${outfit.className}`}>PRISM_CORE_v4.2</span>
            <span className={`text-[8px] ${jetBrains.className} text-zinc-600 uppercase tracking-widest flex items-center gap-2`}>
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Status: Nominal
            </span>
          </div>
        </div>

        {/* Top Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id as ViewMode)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all group ${
                currentView === tab.id 
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 shadow-[0_0_20px_rgba(0,229,255,0.05)]' 
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <tab.icon size={13} className={currentView === tab.id ? 'text-[#00E5FF] animate-pulse' : 'text-zinc-700 group-hover:text-zinc-400'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Global Stats/Actions */}
      <div className="hidden xl:flex items-center gap-10">
        <div className="flex items-center gap-8 pr-10 border-r border-white/[0.06]">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-end gap-1">
              <span className={`text-[9px] font-black tracking-[0.15em] text-zinc-600 flex items-center gap-1.5 uppercase`}>
                <stat.icon size={10} className={stat.color} /> {stat.label}
              </span>
              <span className={`text-[13px] font-bold ${jetBrains.className} text-zinc-300`}>{stat.value}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
           <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
              <Search size={16} />
           </button>
           <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-600 hover:text-red-500 transition-colors border-dashed">
              <Power size={16} />
           </button>
        </div>
      </div>
    </header>
  );
};
