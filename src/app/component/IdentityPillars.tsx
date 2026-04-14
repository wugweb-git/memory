"use client";
import React from 'react';
import { 
  History, Sparkles, Zap, Shield, 
  Lightbulb, Compass, Target, 
  Globe, Fingerprint, Terminal, Scale
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

const PILLARS = [
  {
    id: 'origin',
    label: 'The Origin / Spirit',
    title: 'The Intersection of Architecture & Logic',
    content: 'My journey began in the physical world of architecture, where I learned that every structure is simply a materialized logic map. Today, I build digital ontologies that act as "Digital Vacuums"—ingesting complex signals and synthesizing them into professional clarity.',
    icon: Compass,
    color: 'text-[#00E5FF]'
  },
  {
    id: 'philosophy',
    label: 'The Philosophy / 2026',
    title: 'Proof of Human Logic',
    content: 'In an AI-saturated world, the ultimate competitive advantage is "Signature Logic." I focus on building systems where AI serves as the infrastructure (the "Vacuum"), while human spirit provides the vector (the "Prism").',
    icon: Scale,
    color: 'text-[#10B981]'
  },
  {
    id: 'stack',
    label: 'The Stack / Neural',
    title: 'RAG-Enabled Cognitive Mapping',
    content: 'My stack isn\'t just React and TypeScript; it’s a living RAG implementation where every venture node is a vector. I use Atlas Vector Search to ensure that 8 years of F&B, Fintech, and AI experience are always retrievable as instant strategic insight.',
    icon: Terminal,
    color: 'text-[#F59E0B]'
  }
];

export const IdentityPillars = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {PILLARS.map((p) => (
        <div key={p.id} className="glass-panel p-10 rounded-[2.5rem] border border-white/[0.06] hover:border-white/20 transition-all duration-700 group relative overflow-hidden flex flex-col items-start text-left">
          {/* Tone Indicator Mask */}
          <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className={`text-[8px] font-black ${jetBrains.className} text-zinc-800 uppercase tracking-[0.4em] rotate-90 origin-right`}>
              TONE: SOPHISTICATED_TECH
            </p>
          </div>

          <div className="mb-10 flex items-center gap-4">
             <div className={`p-3 rounded-2xl bg-black border border-white/10 ${p.color} transition-transform group-hover:scale-110 duration-500`}>
                <p.icon size={20} />
             </div>
             <span className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase">{p.label}</span>
          </div>

          <h3 className={`text-xl font-black text-white uppercase tracking-wider mb-6 leading-snug group-hover:text-white transition-colors ${outfit.className}`}>
            {p.title}
          </h3>
          
          <p className="text-[13px] text-zinc-500 leading-relaxed font-medium mb-8">
            {p.content}
          </p>

          <div className="mt-auto pt-6 border-t border-white/[0.06] w-full flex items-center justify-between">
            <span className={`text-[9px] font-black tracking-[0.2em] text-zinc-700 uppercase`}>Signature_Logic_Node</span>
            <Sparkles size={12} className="text-zinc-800 group-hover:text-[#00E5FF] transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
};
