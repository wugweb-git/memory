"use client";
import React from 'react';
import { 
  Cpu, Layout, Briefcase, HeartPulse, Shield, Globe, 
  Terminal, Zap, Database, TrendingUp, Layers, Brain, 
  Coffee, Plus, X
} from 'lucide-react';
import { motion } from 'framer-motion';

export const INDUSTRIES = [
  { id: '1', name: 'Systems Architect', icon: Cpu, count: 42 },
  { id: '2', name: 'Fintech', icon: TrendingUp, count: 18 },
  { id: '3', name: 'UX/Product', icon: Layout, count: 25 },
  { id: '4', name: 'AI Engineering', icon: Brain, count: 33 },
  { id: '5', name: 'Life Coaching', icon: HeartPulse, count: 12 },
  { id: '6', name: 'Marketing', icon: Globe, count: 15 },
  { id: '7', name: 'F&B Strategy', icon: Coffee, count: 9 },
  { id: '8', name: 'Product Delivery', icon: Layers, count: 21 },
  { id: '9', name: '0→1 Thinking', icon: Shield, count: 14 },
  { id: '10', name: 'Tech/DevOps', icon: Terminal, count: 28 },
  { id: '11', name: 'Digital Identity', icon: Database, count: 7 },
  { id: '12', name: 'Salesforce CRM', icon: Zap, count: 14 },
];

export const IndustryBento = ({ 
  selected, 
  onSelect 
}: { 
  selected?: string, 
  onSelect: (id: string | null) => void 
}) => {
  return (
    <section aria-label="Industry vectors" className="w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 mb-8">
        <div className="kinetic-text">
          <h3 className="text-xl md:text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Layers size={22} className="text-accent" /> Matrix_Clusters
          </h3>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">Active Capacity — {INDUSTRIES.length} Neural Sectors</p>
        </div>
        {selected && (
          <motion.button 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={() => onSelect(null)}
            className="text-[10px] font-black text-danger uppercase tracking-widest flex items-center gap-2 bg-danger/5 px-5 py-2.5 rounded-full border border-danger/20 hover:bg-danger/10 transition-all active:scale-95"
            aria-label="Clear filter"
          >
            Reset_Matrix <X size={12} strokeWidth={3} />
          </motion.button>
        )}
      </div>
      
      <div
        role="listbox"
        aria-label="Select an industry to filter"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6"
      >
        {INDUSTRIES.map((industry, idx) => {
          const isSelected = selected === industry.name;
          return (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              type="button"
              key={industry.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(industry.name)}
              className={`
                group p-6 rounded-[2rem] border transition-all duration-700 cursor-pointer relative overflow-hidden shadow-sm
                ${isSelected 
                  ? 'bg-accent text-bg-primary border-accent shadow-2xl shadow-accent/40 scale-105' 
                  : 'glass-panel border-border-secondary hover:border-border-primary hover:shadow-xl'}
              `}
            >
              {/* Highlight decoration */}
              <div className={`absolute top-0 right-0 w-16 h-16 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'bg-white/20' : 'bg-accent/10'}`} />

              <div className="flex items-center justify-between mb-8">
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-inner group-hover:rotate-6
                  ${isSelected ? 'bg-white/20 text-bg-primary border-white/20' : 'bg-bg-secondary border-border-primary text-text-tertiary'}
                `}>
                  <industry.icon size={22} aria-hidden="true" />
                </div>
                <span className={`text-[10px] font-black font-mono transition-opacity duration-700 ${isSelected ? 'text-bg-primary/40' : 'text-text-disabled opacity-40'}`}>
                  {industry.id.padStart(2, '0')}
                </span>
              </div>
              
              <div className="space-y-4">
                <h4 className={`text-xs font-black uppercase tracking-widest leading-none kinetic-text ${
                  isSelected ? 'text-bg-primary' : 'text-text-primary'
                }`}>{industry.name}</h4>
                <div className="space-y-2">
                  <div className={`h-1.5 w-full rounded-full overflow-hidden p-[1px] border shadow-inner ${
                    isSelected ? 'bg-white/10 border-white/20' : 'bg-secondary border-border-primary'
                  }`}>
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${(industry.count / 42) * 100}%` }} 
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${isSelected ? 'bg-bg-primary' : 'bg-accent opacity-60'}`} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-black font-mono tracking-widest italic">
                     <span className={`uppercase ${isSelected ? 'text-bg-primary/60' : 'text-text-disabled'}`}>Density</span>
                     <span className={isSelected ? 'text-bg-primary' : 'text-accent'}>{industry.count}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
        
        {/* Add vector: tactile action */}
        <button
          className="p-6 rounded-[2rem] border-2 border-dashed border-border-secondary bg-secondary/20 flex flex-col items-center justify-center text-center group hover:border-accent hover:bg-bg-primary hover:shadow-2xl transition-all duration-700 cursor-pointer min-h-[160px]"
          aria-label="Add new industry vector"
        >
          <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-secondary flex items-center justify-center text-text-disabled group-hover:text-accent group-hover:rotate-90 transition-all duration-700 mb-4 shadow-sm group-hover:shadow-accent/10">
            <Plus size={22} strokeWidth={3} />
          </div>
          <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] group-hover:text-accent transition-colors italic">Attach_Sector</span>
        </button>
      </div>
    </section>
  );
};
