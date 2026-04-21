"use client";
import React from 'react';
import { Heart, Sparkles, ExternalLink, Globe, MousePointer2, Plus, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';

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
    whyLiked: 'Crucial for the AI Engineering workspace. Explains why Atlas Vector Search performs on RAG tasks.',
    industry: 'AI Engineering',
    tags: ['Database', 'RAG', 'Perf'],
    date: '1d ago'
  }
];

export const InspirationHub = () => {
  return (
    <section className="space-y-10 w-full" aria-label="Inspiration hub">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Bookmark size={22} className="text-danger" /> Inspiration_Nexus
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">Curated External Activity — Global Collector</p>
        </div>
        <div className="px-5 py-2 rounded-full bg-danger/5 border border-danger/20 text-[10px] font-black text-danger flex items-center gap-3 uppercase tracking-widest shadow-sm">
           <Heart size={14} fill="currentColor" className="animate-pulse" /> Collector: ACTIVE
        </div>
      </div>

      <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {CURATED_ITEMS.map((item, idx) => (
          <motion.li 
            key={item.id} 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            role="listitem"
          >
            <article className="glass-panel rounded-[2rem] p-8 border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all duration-700 group flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-danger/5 blur-[50px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <header className="flex items-center justify-between mb-8">
                <span className="text-[10px] font-black text-text-tertiary tracking-[0.2em] uppercase flex items-center gap-3 italic">
                  <Globe size={14} className="text-text-disabled" /> {item.platform}
                </span>
                <time dateTime={item.date} className="text-[10px] text-text-disabled font-mono font-bold uppercase tracking-widest text-right">{item.date}</time>
              </header>
              
              <h3 className="text-lg font-black text-text-primary mb-6 group-hover:text-danger transition-colors leading-none tracking-tight kinetic-text">{item.title}</h3>
              
              <div className="p-5 rounded-radius-xl bg-bg-secondary/40 border-l-2 border-danger/40 mb-6 flex-1 shadow-inner group/summary">
                <div className="flex items-center gap-3 mb-3 text-[9px] font-black text-danger tracking-[0.3em] uppercase">
                  <Sparkles size={12} className="opacity-60" /> THE_WHY
                </div>
                <p className="text-xs text-text-secondary leading-relaxed font-medium italic">&ldquo;{item.whyLiked}&rdquo;</p>
              </div>

              <footer className="flex items-center justify-between mt-auto pt-6 border-t border-border-secondary/50">
                <div className="flex gap-2">
                  {item.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] px-3 py-1 rounded-lg bg-bg-secondary border border-border-secondary text-text-tertiary font-black font-mono uppercase italic">{tag}</span>
                  ))}
                </div>
                <button className="w-10 h-10 rounded-2xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-bg-primary hover:bg-black transition-all flex items-center justify-center shadow-lg active:scale-90" aria-label={`Open ${item.title}`}>
                  <ExternalLink size={16} />
                </button>
              </footer>
            </article>
          </motion.li>
        ))}

        {/* Collector extension: Tactile Empty State */}
        <li role="listitem">
          <div className="glass-panel rounded-[2.5rem] p-8 border-2 border-dashed border-border-secondary flex flex-col items-center justify-center text-center min-h-[320px] hover:border-danger/30 hover:bg-bg-primary hover:shadow-2xl transition-all duration-700 group cursor-pointer">
            <motion.div 
               animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               className="w-16 h-16 rounded-2xl bg-bg-secondary border border-border-secondary flex items-center justify-center mb-6 text-text-disabled shadow-inner group-hover:shadow-danger/10 group-hover:bg-bg-primary transition-all overflow-hidden"
            >
              <MousePointer2 size={28} className="group-hover:text-danger transition-colors" />
            </motion.div>
            <div className="space-y-4">
               <p className="text-xs font-black text-text-tertiary uppercase tracking-[0.3em]">Collector_Node_Inactive</p>
               <p className="text-[10px] text-text-disabled max-w-[180px] leading-relaxed font-bold uppercase tracking-widest opacity-40">Install browser extension to map web-likes to the prism.</p>
            </div>
          </div>
        </li>
      </ul>
    </section>
  );
};
