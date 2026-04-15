"use client";
import React from 'react';
import { Heart, Sparkles, ExternalLink, Globe, MousePointer2, Plus } from 'lucide-react';

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
    whyLiked: 'Crucial for the AI Engineering workspace. Explains why Atlas Vector Search outperforms dedicated DBs on RAG tasks.',
    industry: 'AI Engineering',
    tags: ['Database', 'RAG', 'Perf'],
    date: '1d ago'
  }
];

export const InspirationHub = () => {
  return (
    <section className="space-y-6 max-w-5xl mx-auto w-full" aria-label="Inspiration hub">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Inspiration Hub</h2>
          <p className="text-xs text-text-tertiary font-normal mt-1 uppercase tracking-wider">Curated External Activity</p>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-[10px] font-bold text-danger uppercase flex items-center gap-2">
          <Heart size={11} fill="currentColor" aria-hidden="true" /> Collector: On
        </span>
      </div>

      <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CURATED_ITEMS.map((item) => (
          <li key={item.id} role="listitem">
            <article className="glass-card rounded-2xl p-6 border border-primary hover:border-primary/50 transition-all group flex flex-col h-full">
              <header className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase flex items-center gap-2">
                  <Globe size={11} aria-hidden="true" /> {item.platform}
                </span>
                <time dateTime={item.date} className="text-[10px] text-text-tertiary font-mono">{item.date}</time>
              </header>
              
              <h3 className="text-sm font-semibold text-text-primary mb-4 group-hover:text-accent transition-colors leading-snug">{item.title}</h3>
              
              <div className="p-3.5 rounded-xl bg-secondary border border-primary mb-4 flex-1">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-text-tertiary tracking-widest uppercase">
                  <Sparkles size={10} aria-hidden="true" /> Why I Liked This
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">&ldquo;{item.whyLiked}&rdquo;</p>
              </div>

              <footer className="flex items-center justify-between mt-auto">
                <div className="flex gap-1.5">
                  {item.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-secondary border border-primary text-text-tertiary font-mono uppercase">{tag}</span>
                  ))}
                </div>
                <button className="p-2 rounded-lg bg-secondary border border-primary text-text-tertiary hover:text-text-primary transition-colors focus-ring" aria-label={`Open ${item.title}`}>
                  <ExternalLink size={13} aria-hidden="true" />
                </button>
              </footer>
            </article>
          </li>
        ))}

        {/* Collector extension */}
        <li role="listitem">
          <div className="glass-card rounded-2xl p-6 border-2 border-dashed border-primary flex flex-col items-center justify-center text-center min-h-[240px] hover:border-accent/20 hover:bg-secondary/50 transition-all cursor-pointer">
            <div className="w-11 h-11 rounded-xl bg-secondary border border-primary flex items-center justify-center mb-4 text-text-disabled">
              <MousePointer2 size={22} aria-hidden="true" />
            </div>
            <p className="text-xs font-bold text-text-tertiary tracking-widest uppercase">Collector Inactive</p>
            <p className="text-xs text-text-disabled max-w-[160px] mt-2 leading-relaxed">Install browser extension to map web-likes to the prism.</p>
          </div>
        </li>
      </ul>
    </section>
  );
};
