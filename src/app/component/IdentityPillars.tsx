"use client";
import React from 'react';
import { Compass, Scale, Terminal } from 'lucide-react';

const PILLARS = [
  {
    id: 'origin',
    label: 'Origin / Spirit',
    title: 'Architecture & Logic',
    content: 'My journey began in the physical world of architecture, where I learned that every structure is a materialized logic map. Today, I build digital ontologies that ingest complex signals and synthesize them into professional clarity.',
    icon: Compass,
  },
  {
    id: 'philosophy',
    label: 'Philosophy / 2026',
    title: 'Proof of Human Logic',
    content: 'In an AI-saturated world, the ultimate advantage is Signature Logic. I build systems where AI serves as infrastructure while human spirit provides the vector.',
    icon: Scale,
  },
  {
    id: 'stack',
    label: 'Stack / Neural',
    title: 'RAG-Enabled Cognitive Mapping',
    content: 'My stack is a living RAG implementation where every venture node is a vector. I use Atlas Vector Search to make 8 years of F&B, Fintech, and AI experience instantly retrievable as strategic insight.',
    icon: Terminal,
  },
];

export const IdentityPillars = () => {
  return (
    <section aria-label="Identity pillars">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PILLARS.map((p) => (
          <article
            key={p.id}
            className="glass-card p-6 rounded-2xl border border-primary hover:border-accent/20 transition-all duration-500 group flex flex-col"
          >
            <header className="mb-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-secondary border border-primary text-accent group-hover:bg-accent/10 transition-colors">
                <p.icon size={18} aria-hidden="true" />
              </div>
              <span className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase">{p.label}</span>
            </header>

            <h3 className="text-base font-semibold text-text-primary tracking-tight mb-3 leading-snug">
              {p.title}
            </h3>
            
            <p className="text-sm text-text-secondary leading-relaxed font-normal flex-1">
              {p.content}
            </p>

            <footer className="mt-5 pt-4 border-t border-primary flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Signature Logic</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-40 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
};
