"use client";
import React from 'react';
import { 
  Cpu, Layout, Briefcase, HeartPulse, Shield, Globe, 
  Terminal, Zap, Database, TrendingUp, Layers, Brain, 
  Coffee, Plus, X
} from 'lucide-react';

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
    <section aria-label="Industry vectors">
      <div className="flex items-center justify-between px-1 mb-4">
        <h3 className="text-xs font-bold tracking-widest text-text-tertiary uppercase flex items-center gap-2">
          <Layers size={13} className="text-accent" aria-hidden="true" /> Active Vectors — {INDUSTRIES.length} Clusters
        </h3>
        {selected && (
          <button 
            onClick={() => onSelect(null)}
            className="text-xs font-semibold text-danger/70 hover:text-danger transition-colors uppercase flex items-center gap-1.5 bg-danger/5 px-3 py-1.5 rounded-lg border border-danger/10 focus-ring"
            aria-label="Clear filter"
          >
            Clear Filter <X size={11} aria-hidden="true" />
          </button>
        )}
      </div>
      
      <div
        role="listbox"
        aria-label="Select an industry to filter"
        aria-multiselectable="false"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3"
      >
        {INDUSTRIES.map((industry) => {
          const isSelected = selected === industry.name;
          return (
            <button
              type="button"
              key={industry.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(industry.name)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(industry.name); } }}
              className={`group p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden focus-ring ${
                isSelected 
                  ? 'bg-accent/10 border-accent/30 ring-1 ring-accent/20' 
                  : 'glass-card border-primary hover:border-primary hover:bg-secondary'
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-secondary border-primary text-text-tertiary group-hover:border-primary group-hover:text-text-secondary'
                }`}>
                  <industry.icon size={16} aria-hidden="true" />
                </div>
                <span className="text-[10px] font-mono text-text-disabled">{industry.id.padStart(2, '0')}</span>
              </div>
              
              <div className="space-y-3">
                <h4 className={`text-xs font-semibold uppercase tracking-wide leading-tight transition-colors ${
                  isSelected ? 'text-accent' : 'text-text-primary'
                }`}>{industry.name}</h4>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 flex-1 bg-primary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${isSelected ? 'bg-accent' : 'bg-text-tertiary'} opacity-50`} 
                      style={{ width: `${(industry.count / 42) * 100}%` }} 
                    />
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-accent' : 'text-text-tertiary'}`}>{industry.count}</span>
                </div>
              </div>
            </button>
          );
        })}
        
        {/* Add new */}
        <button
          className="p-5 rounded-2xl border-2 border-dashed border-primary bg-secondary/30 flex flex-col items-center justify-center text-center group hover:border-accent/30 transition-all duration-500 cursor-pointer min-h-[120px] focus-ring"
          aria-label="Add new industry vector"
          onClick={() => {}}
        >
          <div className="w-9 h-9 rounded-xl bg-secondary border border-primary flex items-center justify-center text-text-disabled group-hover:text-accent group-hover:rotate-90 transition-all duration-500 mb-3">
            <Plus size={18} aria-hidden="true" />
          </div>
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest group-hover:text-text-secondary transition-colors">Add Vector</span>
        </button>
      </div>
    </section>
  );
};
