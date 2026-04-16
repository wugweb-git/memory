"use client";
import React from 'react';
import { BookOpen, Layers, Share2, Sparkles, ArrowUpRight, Globe, Substack, Linkedin } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_WORKS = [
  { 
    id: '1', 
    title: 'The Future of UX in Fintech Architecture', 
    source: 'Substack', 
    summary: 'A deep dive into 0→1 scaling for digital banking interfaces and high-stakes logic.', 
    tags: ['UX', 'Fintech', 'Scaling'], 
    url: '#',
    summaryAI: 'Emphasizes reduced friction in high-stakes transactions as core UX metric.',
    date: 'April 2026'
  },
  { 
    id: '2', 
    title: 'Architecting Scalable Vector Engines', 
    source: 'Medium', 
    summary: 'Technical breakdown of RAG optimization strategies for real-time retrieval.', 
    tags: ['AI Engine', 'RAG', 'Vector'], 
    url: '#',
    summaryAI: 'Focuses on latent space efficiency for real-time retrieval pipelines.',
    date: 'March 2026'
  },
];

export const PublishedWorks = () => {
  return (
    <section className="space-y-10 w-full" aria-label="Published works">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <BookOpen size={22} className="text-accent" /> Works_Matrix
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">Thought Leadership — External Content Stream</p>
        </div>
        <div className="px-5 py-2 rounded-full bg-secondary border border-border-secondary text-[10px] font-black text-text-tertiary flex items-center gap-3 uppercase tracking-widest shadow-sm">
           <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Automated Collection: Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {MOCK_WORKS.map((work, idx) => (
          <motion.article 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            key={work.id} 
            className="glass-panel rounded-[2rem] p-8 border border-border-secondary group transition-all duration-700 hover:border-accent/40 hover:shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <header className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border border-border-secondary bg-bg-secondary text-text-secondary shadow-sm">
                  {work.source}
                </span>
                <time dateTime={work.date} className="text-[10px] text-text-disabled font-mono font-bold uppercase tracking-widest italic">{work.date}</time>
              </div>
              <a 
                href={work.url}
                aria-label={`Open: ${work.title}`}
                className="w-10 h-10 rounded-2xl bg-bg-elevated border border-border-primary text-text-tertiary hover:text-bg-primary hover:bg-black group-hover:rotate-45 transition-all duration-500 flex items-center justify-center shadow-lg active:scale-90"
              >
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </header>

            <div className="space-y-6 mb-8 relative z-10">
              <h3 className="text-xl font-black text-text-primary tracking-tighter leading-none kinetic-text transition-colors">
                {work.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed font-medium line-clamp-2 italic">{work.summary}</p>
              <div className="flex flex-wrap gap-2">
                {work.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-lg bg-bg-secondary border border-border-secondary text-[9px] font-black font-mono text-text-tertiary uppercase tracking-tighter italic">{tag}</span>
                ))}
              </div>
            </div>

            {/* AI synthesis: Neo-minimalist card */}
            <div className="p-6 rounded-[1.5rem] bg-bg-secondary/40 border border-border-primary relative overflow-hidden group/synthesis">
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover/synthesis:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex items-center gap-3 mb-3 text-[10px] font-black text-success tracking-[0.3em] uppercase">
                <Sparkles size={13} className="animate-pulse" aria-hidden="true" /> Logic Synthesis
              </div>
              <p className="text-xs text-text-secondary italic leading-relaxed font-medium border-l-2 border-success/30 pl-4">
                &ldquo;{work.summaryAI}&rdquo;
              </p>
            </div>
          </motion.article>
        ))}

        {/* Behance embed placeholder: 2026 Claymorphism style */}
        <article className="glass-panel rounded-[2.5rem] p-10 border border-border-secondary shadow-2xl flex flex-col min-h-[450px] group relative overflow-hidden">
          <header className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center text-text-secondary shadow-inner">
              <Globe size={20} aria-hidden="true" />
            </div>
            <div className="kinetic-text">
               <h3 className="text-xs font-black text-text-primary tracking-[0.3em] uppercase">Creative_Node</h3>
               <p className="text-[9px] font-bold text-text-disabled uppercase mt-1">Provider: Behance_API_Sync</p>
            </div>
          </header>
          
          <div className="flex-1 rounded-[2rem] bg-bg-secondary border border-border-primary relative overflow-hidden group-hover:border-accent/30 transition-all duration-700 shadow-inner group/canvas">
            <div className="absolute inset-0 grid-bg opacity-10" aria-hidden="true" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-20 h-20 rounded-3xl bg-bg-primary shadow-2xl flex items-center justify-center border border-border-secondary mb-8 group-hover/canvas:shadow-accent/10 group-hover/canvas:-translate-y-2 transition-all duration-700"
              >
                 <Share2 size={32} className="text-text-disabled" aria-hidden="true" />
              </motion.div>
              <p className="text-xs font-black text-text-tertiary uppercase tracking-[0.3em]">Behance Project Nexus</p>
              <span className="text-[9px] font-black text-text-disabled uppercase mt-2 tracking-widest opacity-40 italic">State: Synchronized</span>
            </div>
          </div>
          
          <footer className="mt-8 flex items-center justify-between px-2">
            <span className="text-[10px] text-text-disabled font-black font-mono uppercase tracking-[0.1em] opacity-60 italic">Updated: 0x4B3A8_SYNC</span>
            <button className="px-6 py-2.5 rounded-full bg-black text-bg-primary text-[10px] font-black uppercase tracking-widest hover:scale-110 active:scale-90 transition-all shadow-xl">
              Launch Node
            </button>
          </footer>
        </article>
      </div>
    </section>
  );
};
