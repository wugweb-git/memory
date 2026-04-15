"use client";
import React from 'react';
import { BookOpen, Layers, Share2, Sparkles, ArrowUpRight } from 'lucide-react';

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
    <section className="space-y-8 max-w-5xl mx-auto w-full" aria-label="Published works">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Works Hub</h2>
          <p className="text-xs text-text-tertiary font-normal mt-1 uppercase tracking-wider">Thought Leadership — External Content Stream</p>
        </div>
        <span className="px-4 py-2 rounded-xl bg-secondary border border-primary text-xs font-bold text-text-secondary flex items-center gap-2 self-start">
          <BookOpen size={13} className="text-accent animate-pulse" aria-hidden="true" /> Automated Collection: Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {MOCK_WORKS.map((work) => (
          <article key={work.id} className="glass-panel rounded-2xl p-6 border border-primary group transition-all duration-500 hover:border-accent/20">
            <header className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-primary bg-secondary text-text-tertiary">
                  {work.source}
                </span>
                <time dateTime={work.date} className="text-[10px] text-text-tertiary font-mono">{work.date}</time>
              </div>
              <a 
                href={work.url}
                aria-label={`Open: ${work.title}`}
                className="p-2 rounded-xl bg-secondary border border-primary text-text-tertiary hover:text-text-primary hover:bg-accent hover:text-primary group-hover:rotate-45 transition-all duration-500 focus-ring"
              >
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </header>

            <div className="space-y-4 mb-6">
              <h3 className="text-base font-semibold text-text-primary tracking-tight leading-snug group-hover:text-accent transition-colors">
                {work.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed font-normal">{work.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {work.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-secondary border border-primary text-[10px] font-mono text-text-tertiary uppercase">{tag}</span>
                ))}
              </div>
            </div>

            {/* AI synthesis */}
            <div className="p-4 rounded-xl bg-success/5 border border-success/10 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-success tracking-widest uppercase">
                <Sparkles size={11} className="animate-pulse" aria-hidden="true" /> Logic Synthesis
              </div>
              <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-success/20 pl-3">
                &ldquo;{work.summaryAI}&rdquo;
              </p>
            </div>
          </article>
        ))}

        {/* Behance embed placeholder */}
        <article className="glass-panel rounded-2xl p-6 border border-primary flex flex-col min-h-[400px] group">
          <header className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-secondary border border-primary flex items-center justify-center text-text-secondary">
              <Layers size={16} aria-hidden="true" />
            </div>
            <h3 className="text-xs font-bold text-text-primary tracking-widest uppercase">Creative Node — Behance</h3>
          </header>
          
          <div className="flex-1 rounded-xl bg-secondary border border-primary relative overflow-hidden group-hover:border-accent/20 transition-all duration-500">
            <div className="absolute inset-0 grid-bg opacity-10" aria-hidden="true" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <Share2 size={40} className="text-text-disabled mb-4 group-hover:text-text-tertiary transition-colors" aria-hidden="true" />
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Behance Project Embed</p>
              <span className="text-[10px] font-mono text-text-disabled uppercase mt-1">Sync Active</span>
            </div>
          </div>
          
          <footer className="mt-4 flex items-center justify-between">
            <span className="text-[10px] text-text-tertiary font-mono uppercase">Synced 2h ago</span>
            <button className="text-xs font-bold text-accent hover:underline uppercase tracking-widest focus-ring" aria-label="View Behance project">
              View Project
            </button>
          </footer>
        </article>
      </div>
    </section>
  );
};
