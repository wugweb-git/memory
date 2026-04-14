"use client";
import React from 'react';
import { 
  Rocket, Server, Shield, Share2, ArrowRight, 
  ExternalLink, Code2, Layers, Cpu, Database,
  TrendingUp, Globe, Box, Workflow, Fingerprint, Sparkles
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

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
    <div className="space-y-12">
      <div className="flex items-center justify-between px-4">
        <div className="text-left">
          <h2 className={`text-2xl font-black tracking-[0.1em] text-white uppercase mb-2 ${outfit.className}`}>Venture Vault</h2>
          <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase opacity-60 italic">Product DNA // Legacy Logic Mapping</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-[#00E5FF] transition-colors cursor-pointer group">
           <Fingerprint size={24} className="group-hover:scale-110 duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
        {filtered.map((node) => (
          <div key={node.id} className="glass-panel rounded-[2rem] p-10 border border-white/[0.06] transition-all duration-700 hover:scale-[1.02] hover:border-white/20 active:scale-95 cursor-default relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 p-10 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="w-32 h-32 bg-[#00E5FF]/5 rounded-full blur-3xl"></div>
            </div>

            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-white shadow-2xl group-hover:text-[#00E5FF] transition-colors">
                     {node.industry === 'Fintech' ? <TrendingUp size={20} /> : <Brain size={20} />}
                  </div>
                  <div className="text-left">
                    <h3 className={`text-lg font-black text-white uppercase tracking-wider mb-0.5 ${outfit.className}`}>{node.name}</h3>
                    <p className={`text-[9px] font-black ${jetBrains.className} text-zinc-600 tracking-[0.2em] uppercase`}>{node.industry}</p>
                  </div>
               </div>
               <div className="px-3 py-1 rounded-full border border-white/10 bg-black text-[9px] font-black text-zinc-400 uppercase tracking-widest italic group-hover:border-[#00E5FF]/40 group-hover:text-[#00E5FF] transition-all">
                  NODE_{node.id.padStart(2, '0')}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-10">
               <div className="space-y-2">
                  <span className="text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase">Venture_Phase</span>
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                     <span className="text-[11px] font-bold text-zinc-300 uppercase">{node.phase}</span>
                  </div>
               </div>
               <div className="space-y-2 border-l border-white/5 pl-6">
                  <span className="text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase">Executive_Role</span>
                  <span className="block text-[11px] font-bold text-zinc-300 uppercase">{node.role}</span>
               </div>
            </div>

            <div className="space-y-8 mb-10">
               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase flex items-center gap-2 italic">
                     <Workflow size={12} className="text-[#00E5FF]" /> Logic_Transfer
                  </h4>
                  <p className="text-[12px] text-zinc-400 leading-relaxed font-semibold">
                    &quot;{node.logicApplied}&quot;
                  </p>
               </div>
               
               <div className="p-8 rounded-3xl bg-[#00E5FF]/5 border border-[#00E5FF]/10 ring-1 ring-[#00E5FF]/5 group-hover:ring-[#00E5FF]/20 transition-all">
                  <h4 className="text-[10px] font-black text-[#00E5FF] tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
                     <Sparkles size={12} className="animate-pulse" /> 2026_Refactored_Perspective
                  </h4>
                  <p className="text-[11px] text-zinc-200 leading-relaxed font-medium">
                     {node.perspective2026}
                  </p>
               </div>
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-white/[0.06]">
               <div className="flex gap-2">
                  {node.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">{tag}</span>
                  ))}
               </div>
               <button className="p-3 rounded-xl bg-white/5 text-zinc-600 hover:text-white transition-all shadow-xl hover:shadow-[#00E5FF]/5">
                  <ArrowRight size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
