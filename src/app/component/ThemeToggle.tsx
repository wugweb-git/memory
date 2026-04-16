"use client";
import React from 'react';
import { Sun, Lock } from 'lucide-react';

/**
 * ThemeToggle - Redefined as a 'Light Mode Locked' indicator to respect the 
 * USER request to disable dark theme while maintaining the 2026 Neo-minimalist aesthetic.
 */
export const ThemeToggle = () => {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-bg-secondary border border-border-secondary text-text-tertiary cursor-help group shadow-inner"
      title="Environment locked to Light Mode"
    >
      <div className="relative">
         <Sun size={18} className="text-warning animate-pulse" />
         <div className="absolute -top-1 -right-1">
            <Lock size={10} className="text-text-disabled" />
         </div>
      </div>
      <div className="flex flex-col">
         <span className="text-[9px] font-black tracking-widest uppercase">SOLAR_SYST_ACTIVE</span>
         <span className="text-[8px] font-bold text-text-disabled uppercase opacity-60">Dark_Mode_Restricted</span>
      </div>
    </div>
  );
};
