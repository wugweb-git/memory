"use client";
import React from 'react';
import { Compass, Scale, Terminal, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { IDENTITY_PILLARS } from '@/config/ui-content';

const PILLAR_ICONS = { origin: Compass, philosophy: Scale, stack: Terminal } as const;

const PILLARS = IDENTITY_PILLARS.map((p) => ({
  ...p,
  icon: PILLAR_ICONS[p.id as keyof typeof PILLAR_ICONS],
}));

export const IdentityPillars = () => {
  return (
    <section aria-label="Identity pillars" className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PILLARS.map((p, idx) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            className="glass-panel p-8 rounded-[2.5rem] border border-border-secondary hover:border-border-primary transition-all duration-700 group flex flex-col relative overflow-hidden hover:shadow-2xl"
          >
            {/* Perspective glow */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-accent/5 blur-[50px] pointer-events-none group-hover:bg-accent/10 transition-colors" />

            <header className="mb-8 flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-bg-secondary border border-border-primary shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${p.accent}`}>
                <p.icon size={20} aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                 <span className="text-2xs font-black text-text-tertiary tracking-[0.3em] uppercase block">{p.label}</span>
                 <div className="h-0.5 w-8 bg-border-secondary group-hover:w-full transition-all duration-700" />
              </div>
            </header>

            <h3 className="text-xl font-black text-text-primary tracking-tighter mb-4 leading-none  kinetic-text group-hover:text-accent transition-colors">
              {p.title}
            </h3>
            
            <p className="text-sm text-text-secondary leading-relaxed font-medium flex-1  tracking-tight">
              {p.content}
            </p>

            <footer className="mt-8 pt-6 border-t border-border-secondary flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Sparkles size={12} className="text-text-disabled opacity-40 group-hover:opacity-100 group-hover:text-accent transition-all" />
                 <span className="text-2xs font-black text-text-disabled uppercase tracking-widest group-hover:text-text-tertiary transition-colors">Signature_Logic</span>
              </div>
              <div className="flex gap-1">
                 <div className="w-1 h-1 rounded-full bg-border-primary" />
                 <div className="w-1 h-1 rounded-full bg-border-primary" />
                 <div className="w-1.5 h-1.5 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </footer>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
