"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Share2, Eye, ExternalLink, Sparkles, 
  ChevronRight, MoreHorizontal, Layout,
  Flame, Star, MessageSquare, Instagram, Package,
  Linkedin, Globe, Brain, Settings
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Suggested', icon: <Sparkles size={14} className="text-accent" /> },
  { name: 'Launch Strategies', icon: <Flame size={14} className="text-warning" /> },
  { name: 'Testimonials', icon: <MessageSquare size={14} className="text-danger" /> },
  { name: 'Instagram', icon: <Instagram size={14} className="text-pink-500" /> },
  { name: 'Services', icon: <Package size={14} className="text-success" /> },
];

const FACETS = [
  { id: '1', platform: 'LinkedIn', label: 'Executive Persona', score: 98, status: 'OPTIMIZED', icon: <Linkedin size={20} className="text-accent" /> },
  { id: '2', platform: 'Twitter/X', label: 'Social Echo', score: 72, status: 'SYNCING', icon: <Share2 size={20} className="text-text-primary" /> },
  { id: '3', platform: 'Portfolio', label: 'Domain Core', score: 85, status: 'STABLE', icon: <Globe size={20} className="text-success" /> },
  { id: '4', platform: 'Medium', label: 'Thought Stream', score: 64, status: 'LEGACY', icon: <Star size={20} className="text-warning" /> },
];

export const IdentityShowcase = () => {
  const [activeTab, setActiveTab] = useState('Suggested');

  return (
    <div className="glass-panel rounded-[3.5rem] border border-border-secondary overflow-hidden shadow-3xl bg-bg-secondary/[0.01]">
      <div className="flex flex-col xl:flex-row min-h-[650px]">
        {/* Sidebar */}
        <aside className="w-full xl:w-96 bg-bg-secondary/40 border-r border-border-primary p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/5 blur-[100px] pointer-events-none" />
          
          <div className="space-y-12 relative z-10">
            <div className="space-y-2">
              <h3 className="text-[10px] font-black tracking-[0.5em] text-accent uppercase">LAYER_3 // CORE</h3>
              <h4 className="text-4xl font-black text-text-primary italic tracking-tighter uppercase leading-[0.9]">Public_Identity_Matrix</h4>
            </div>
            
            <div className="relative group">
              <div className="aspect-[4/5] rounded-[2.5rem] bg-gradient-to-br from-accent to-accent-high p-10 flex flex-col justify-between overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-125 transition-transform duration-700">
                   <Sparkles size={120} className="text-white" />
                </div>
                <div className="relative z-10">
                   <div className="w-12 h-1 w-full bg-white/40 mb-6 rounded-full" />
                   <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                      <Brain size={32} className="text-white" />
                   </div>
                </div>
                <div className="relative z-10 space-y-4">
                  <h4 className="text-4xl font-black text-white leading-[0.9] tracking-tighter">Your Prism is Shining.</h4>
                  <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">92.4% Identity Cohesion</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-5 p-5 rounded-3xl bg-bg-primary/40 border border-border-primary group hover:border-accent/40 mb-2 transition-all">
                 <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-inner group-hover:scale-110 transition-transform">
                    <Eye size={18} />
                 </div>
                 <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block opacity-60 italic">Visibility_Score</span>
                    <span className="text-base font-black text-text-primary tracking-tight">Highly Audible</span>
                 </div>
              </div>
            </div>
          </div>

          <button className="w-full py-5 bg-text-primary text-bg-primary rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-accent transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden">
            <span className="relative z-10">Deploy_Neural_Showcase</span>
            <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-high opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col bg-white/[0.01]">
          {/* Top Bar / Tabs */}
          <div className="p-8 border-b border-border-primary overflow-x-auto scrollbar-hide flex items-center gap-4 bg-bg-secondary/20">
             {CATEGORIES.map(cat => (
               <button 
                 key={cat.name}
                 onClick={() => setActiveTab(cat.name)}
                 className={`px-8 py-4 rounded-2xl flex items-center gap-4 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                   activeTab === cat.name 
                   ? 'bg-text-primary text-bg-primary border-text-primary shadow-2xl scale-105' 
                   : 'bg-bg-secondary/40 border-border-primary/50 text-text-tertiary hover:bg-bg-elevated hover:text-text-primary'
                 }`}
               >
                 {cat.icon}
                 {cat.name}
               </button>
             ))}
             <div className="flex-1" />
             <button className="p-3 text-text-disabled hover:text-text-tertiary transition-colors">
               <Settings size={22} />
             </button>
          </div>

          {/* Grid Area */}
          <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {FACETS.map((facet, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    key={facet.id}
                    className="glass-panel p-10 rounded-[3rem] border border-border-secondary hover:border-accent/40 group relative overflow-hidden flex flex-col justify-between transition-all duration-700 cursor-pointer shadow-xl hover:shadow-3xl"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 blur-[60px] pointer-events-none group-hover:bg-accent/10 transition-all duration-700" />
                    
                    <div className="flex items-start justify-between relative z-10">
                       <div className="w-16 h-16 rounded-3xl bg-bg-secondary border border-border-primary flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                          {facet.icon}
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                            facet.status === 'OPTIMIZED' ? 'bg-success/10 text-success border-success/20' :
                            facet.status === 'SYNCING' ? 'bg-accent/10 text-accent border-accent/20 animate-pulse' :
                            'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {facet.status}
                          </span>
                          <span className="text-[10px] font-bold text-text-tertiary font-mono opacity-50">v.1.4.2</span>
                       </div>
                    </div>

                    <div className="space-y-2 relative z-10 mt-10">
                       <h5 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] opacity-60 italic">{facet.platform}</h5>
                       <h4 className="text-2xl font-black text-text-primary tracking-tighter group-hover:text-accent transition-colors">{facet.label}</h4>
                    </div>

                    <div className="pt-8 relative z-10 flex items-end justify-between border-t border-border-primary/40 mt-8">
                       <div className="space-y-4 w-full">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                             <span className="text-text-tertiary">Cohesion</span>
                             <span className="text-text-primary font-mono">{facet.score}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden p-[1px] border border-border-primary">
                             <motion.div initial={{ width: 0 }} animate={{ width: `${facet.score}%` }} className="h-full bg-accent rounded-full shadow-[0_0_12px_rgba(0,170,255,0.4)]" />
                          </div>
                       </div>
                       <div className="pl-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                          <ExternalLink size={20} className="text-text-disabled group-hover:text-accent transition-colors" />
                       </div>
                    </div>
                  </motion.div>
                ))}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};
