"use client";
import React from 'react';
import { 
  Cpu, Layout, Briefcase, HeartPulse, Shield, Globe, 
  Terminal, Zap, Code, PenTool, Coffee, Search, 
  Database, Gauge, TrendingUp, Layers, Brain, 
  ChevronRight, ArrowUpRight, Plus, X
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

export const INDUSTRIES = [
  { id: '1', name: 'Systems Architect', icon: Cpu, count: 42, color: 'text-blue-400', bg: 'bg-blue-400/5', border: 'border-blue-400/20' },
  { id: '2', name: 'Fintech', icon: TrendingUp, count: 18, color: 'text-emerald-400', bg: 'bg-emerald-400/5', border: 'border-emerald-400/20' },
  { id: '3', name: 'UX/Product', icon: Layout, count: 25, color: 'text-purple-400', bg: 'bg-purple-400/5', border: 'border-purple-400/20' },
  { id: '4', name: 'AI Engineering', icon: Brain, count: 33, color: 'text-[#00E5FF]', bg: 'bg-[#00E5FF]/5', border: 'border-[#00E5FF]/20' },
  { id: '5', name: 'Life Coaching', icon: HeartPulse, count: 12, color: 'text-red-400', bg: 'bg-red-400/5', border: 'border-red-400/20' },
  { id: '6', name: 'Marketing', icon: Globe, count: 15, color: 'text-orange-400', bg: 'bg-orange-400/5', border: 'border-orange-400/20' },
  { id: '7', name: 'F&B Strategy', icon: Coffee, count: 9, color: 'text-amber-400', bg: 'bg-amber-400/5', border: 'border-amber-400/20' },
  { id: '8', name: 'Product Delivery', icon: Layers, count: 21, color: 'text-indigo-400', bg: 'bg-indigo-400/5', border: 'border-indigo-400/20' },
  { id: '9', name: '0→1 Thinking', icon: Shield, count: 14, color: 'text-cyan-400', bg: 'bg-cyan-400/5', border: 'border-cyan-400/20' },
  { id: '10', name: 'Tech/DevOps', icon: Terminal, count: 28, color: 'text-zinc-400', bg: 'bg-zinc-400/5', border: 'border-zinc-400/20' },
  { id: '11', name: 'Digital Identity', icon: Database, count: 7, color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
  { id: '12', name: 'Salesforce CRM', icon: Zap, count: 14, color: 'text-[#00A1E0]', bg: 'bg-[#00A1E0]/5', border: 'border-[#00A1E0]/20' },
];

export const IndustryBento = ({ 
  selected, 
  onSelect 
}: { 
  selected?: string, 
  onSelect: (id: string | null) => void 
}) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h3 className={`text-[11px] font-black tracking-[0.3em] text-zinc-500 uppercase flex items-center gap-3 ${outfit.className}`}>
           <Layers size={14} className="text-[#00E5FF]" /> Active Vectors // {INDUSTRIES.length} Logic Clusters
        </h3>
        {selected && (
          <button 
            onClick={() => onSelect(null)}
            className="text-[10px] font-black text-red-500/60 hover:text-red-500 transition-colors uppercase flex items-center gap-2 bg-red-500/5 px-3 py-1.5 rounded-xl border border-red-500/10"
          >
            Clear Filter <X size={10} />
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {INDUSTRIES.map((industry) => (
          <div 
            key={industry.id} 
            onClick={() => onSelect(industry.name)}
            className={`group p-6 rounded-[2rem] border transition-all duration-700 hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden backdrop-blur-3xl lg:p-7 ${
              selected === industry.name 
                ? 'bg-[#00E5FF]/10 border-[#00E5FF]/40 shadow-[0_0_30px_rgba(0,229,255,0.1)] ring-1 ring-[#00E5FF]/20' 
                : `${industry.bg} ${industry.border} hover:border-white/30`
            }`}
          >
            {/* Top Right Arrow */}
            <div className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all ${selected === industry.name ? 'opacity-100 text-[#00E5FF]' : ''}`}>
               <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>

            <div className="flex items-center justify-between mb-8">
               <div className={`w-10 h-10 rounded-xl bg-black border border-white/10 group-hover:border-white/30 flex items-center justify-center transition-all ${selected === industry.name ? 'border-[#00E5FF]/40' : ''}`}>
                  <industry.icon size={18} className={`${industry.color} transition-colors ${selected === industry.name ? 'text-[#00E5FF]' : ''}`} />
               </div>
               <span className={`text-[9px] font-black ${jetBrains.className} text-zinc-800`}>{industry.id.padStart(2, '0')}</span>
            </div>
            
            <div className="space-y-4">
              <h4 className={`text-[12px] font-black text-white uppercase tracking-wider mb-2 leading-tight group-hover:text-white transition-colors`}>{industry.name}</h4>
              <div className="flex items-center gap-3">
                 <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden p-[1px]">
                    <div className={`h-full ${industry.color.replace('text', 'bg')} opacity-60 transition-all duration-1000 ease-out`} style={{ width: `${(industry.count / 42) * 100}%` }} />
                 </div>
                 <span className={`text-[10px] font-black ${jetBrains.className} ${industry.color}`}>{industry.count}</span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Dynamic New Cluster Piece: Infinite Scalability */}
        <div className="p-7 rounded-[2rem] border border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center text-center group hover:border-[#00E5FF]/40 transition-all duration-700 cursor-pointer min-h-[160px]">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-800 group-hover:text-[#00E5FF] group-hover:rotate-90 transition-all duration-500 mb-4">
               <Plus size={20} />
            </div>
            <p className="text-[10px] font-black text-zinc-700 tracking-[0.3em] uppercase group-hover:text-zinc-500 transition-colors">Add_New_Vector</p>
        </div>
      </div>
    </div>
  );
};
