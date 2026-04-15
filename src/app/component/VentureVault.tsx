"use client";
import React from 'react';
import { 
  TrendingUp, Brain, ArrowRight, Workflow, Sparkles, Fingerprint
} from 'lucide-react';

type VentureNode = {
  id: string;
  name: string;
  industry: string;
  phase: '0→1' | 'Scaling' | 'Exit';
  role: 'Architect' | 'Founder' | 'Delivery';
  logicApplied: string;
  legacyLessons: string;
  perspective2026: string;
  tags: string[];
};

const MOCK_VENTURES: VentureNode[] = [
  {
    id: '1',
    name: 'NeoBank Logic Layer',
    industry: 'Fintech',
    phase: 'Scaling',
    role: 'Architect',
    logicApplied: 'Distributed consensus for micro-settlements.',
    legacyLessons: 'Immutable audit trails are non-negotiable in trustless systems.',
    perspective2026: 'The 2018 settle-logic has been refactored into our 2026 RAG Identity clusters.',
    tags: ['Next.js', 'Solidity', 'Rust']
  },
  {
    id: '2',
    name: 'Prism Identity',
    industry: 'AI Engineering',
    phase: '0→1',
    role: 'Founder',
    logicApplied: 'Vector embedding of human logic pulses.',
    legacyLessons: 'Spirit is the ultimate metadata.',
    perspective2026: 'Current active node. This is the synthesis of all previous ventures.',
    tags: ['LangChain', 'OpenAI', 'Atlas Vector']
  }
];

export const VentureVault = ({ selectedIndustry }: { selectedIndustry?: string }) => {
  const filtered = selectedIndustry 
    ? MOCK_VENTURES.filter(v => v.industry === selectedIndustry)
    : MOCK_VENTURES;

  return (
    <section aria-label="Venture vault">
      <div className="flex items-center justify-between px-1 mb-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Venture Vault</h2>
          <p className="text-xs text-text-tertiary font-normal mt-0.5">Product DNA — Legacy Logic Mapping</p>
        </div>
        <button className="p-2 rounded-xl bg-secondary border border-primary text-text-tertiary hover:text-text-primary transition-colors focus-ring" aria-label="Venture vault settings">
          <Fingerprint size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((node) => (
          <article key={node.id} className="glass-panel rounded-2xl p-6 border border-primary hover:border-accent/20 transition-all duration-500 group relative overflow-hidden">
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary border border-primary flex items-center justify-center text-text-secondary group-hover:text-accent transition-colors">
                  {node.industry === 'Fintech' ? <TrendingUp size={18} aria-hidden="true" /> : <Brain size={18} aria-hidden="true" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary tracking-tight">{node.name}</h3>
                  <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">{node.industry}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full border border-primary bg-secondary text-[10px] font-mono text-text-tertiary uppercase">
                Node_{node.id.padStart(2, '0')}
              </span>
            </header>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase">Phase</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                  <span className="text-xs font-semibold text-text-secondary uppercase">{node.phase}</span>
                </div>
              </div>
              <div className="space-y-1 border-l border-primary pl-4">
                <span className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase">Role</span>
                <span className="block text-xs font-semibold text-text-secondary uppercase">{node.role}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase flex items-center gap-2">
                  <Workflow size={11} className="text-accent" aria-hidden="true" /> Logic Transfer
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">&ldquo;{node.logicApplied}&rdquo;</p>
              </div>
              
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <h4 className="text-[10px] font-bold text-accent tracking-widest uppercase mb-2 flex items-center gap-2">
                  <Sparkles size={11} aria-hidden="true" /> 2026 Perspective
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">{node.perspective2026}</p>
              </div>
            </div>

            <footer className="flex items-center justify-between pt-4 border-t border-primary">
              <div className="flex gap-1.5 flex-wrap">
                {node.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md border border-primary bg-secondary text-[10px] font-mono text-text-tertiary uppercase">{tag}</span>
                ))}
              </div>
              <button className="p-2 rounded-xl bg-secondary text-text-tertiary hover:text-text-primary transition-all focus-ring" aria-label={`View ${node.name} details`}>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
};
