"use client";
import React from 'react';
import { Heart, BookMarked, Sparkles, ExternalLink, Hash, Globe, MousePointer2 } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });

const CURATED_ITEMS = [
  {
    id: '1',
    title: 'The Semantic Web Overhaul 2026',
    platform: 'Mirror',
    whyLiked: 'Essential for my Digital Identity cluster. Bridges the gap between user spirit and machine-readable logic.',
    industry: 'Digital Identity',
    tags: ['Web3', 'AI', 'Ontology'],
    date: '3h ago'
  },
  {
    id: '2',
    title: 'Next-Gen Vector Database Benchmarks',
    platform: 'Substack',
    whyLiked: 'Crucial for the AI Engineering workspace. Explains why Atlas Vector Search is outperforming dedicated vector DBs on RAG tasks.',
    industry: 'AI Engineering',
    tags: ['Database', 'RAG', 'Perf'],
    date: '1d ago'
  }
];

export const InspirationHub = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full py-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 uppercase tracking-[0.1em]">Inspiration Hub</h2>
          <p className="text-zinc-500 text-xs tracking-widest uppercase">Curated External Activity // The Collector Extension</p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase flex items-center gap-2">
           <Heart size={12} fill="currentColor" /> COLLECTOR_SYD_SYNC: ON
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CURATED_ITEMS.map((item) => (
          <div key={item.id} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase flex items-center gap-2">
                  <Globe size={12} /> {item.platform}
               </span>
               <span className="text-[10px] font-bold text-zinc-700 italic">{item.date}</span>
            </div>
            
            <h3 className="text-sm font-bold text-white mb-3 group-hover:text-[#00E5FF] transition-colors">{item.title}</h3>
            
            <div className="p-4 rounded-xl bg-purple-500/[0.03] border border-purple-500/10 mb-6 flex-1">
               <div className="flex items-center gap-2 mb-2 text-[8px] font-black text-purple-400 tracking-widest uppercase">
                 <Sparkles size={10} /> WHY_I_LIKED_THIS
               </div>
               <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                 &quot;{item.whyLiked}&quot;
               </p>
            </div>

            <div className="flex items-center justify-between mt-auto">
               <div className="flex gap-1">
                 {item.tags.slice(0, 2).map(tag => (
                   <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-600 font-bold uppercase">{tag}</span>
                 ))}
               </div>
               <button className="p-2 rounded-lg bg-white/5 text-zinc-500 hover:text-white transition-colors">
                  <ExternalLink size={14} />
               </button>
            </div>
          </div>
        ))}

        {/* The Collector Extension Simulation */}
        <div className="glass-card rounded-2xl p-6 border border-dashed border-white/10 flex flex-col items-center justify-center text-center bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer">
           <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600 group-hover:text-[#00E5FF]">
              <MousePointer2 size={24} />
           </div>
           <p className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase">Collector System Inactive</p>
           <p className="text-[8px] text-zinc-700 max-w-[150px] mt-2 italic font-medium leading-relaxed">Install browser extension to map web-likes to the prism.</p>
        </div>
      </div>
    </div>
  );
};
