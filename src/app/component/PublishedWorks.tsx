"use client";
import React from 'react';
import { 
  FileText, ExternalLink, Tag, Sparkles, Layout, 
  PenTool, Share2, Youtube, Github, Linkedin, 
  ArrowUpRight, Bookmark, Globe, Layers, BookOpen
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/mask-outfit';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
// Note: mask-outfit is a placeholder for my local Outfit font config if needed. 
// Standard Outfit from next/font/google is preferred.
import { Outfit as RegularOutfit } from 'next/font/google';
const outfit = RegularOutfit({ subsets: ['latin'] });

const MOCK_WORKS = [
  { 
    id: '1', 
    title: 'The Future of UX in Fintech architecture', 
    source: 'Substack', 
    summary: 'A deep dive into 0→1 scaling for digital banking interfaces and high-stakes logic.', 
    tags: ['UX', 'Fintech', 'Scaling'], 
    url: '#',
    summaryAI: 'How this Fintech post impacts UX: Emphasizes reduced friction in high-stakes transactions.',
    date: 'April 2026'
  },
  { 
    id: '2', 
    title: 'Architecting Scalable Vector Engines', 
    source: 'Medium', 
    summary: 'Technical breakdown of RAG optimization strategies for real-time retrieval.', 
    tags: ['AI Engine', 'RAG', 'Vector'], 
    url: '#',
    summaryAI: 'How this AI post impacts Architecting: Focuses on latent space efficiency for real-time retrieval.',
    date: 'March 2026'
  },
];

export const PublishedWorks = () => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto w-full py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-4">
        <div className="text-left">
          <h2 className={`text-3xl font-black tracking-[0.1em] text-white uppercase mb-2 ${outfit.className}`}>Works Hub</h2>
          <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase opacity-70 italic">Thought Leadership // External Content Stream</p>
        </div>
        <div className="flex gap-4">
           <div className="px-5 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[11px] font-black text-orange-400 flex items-center gap-3 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
              <BookOpen size={14} className="animate-pulse" /> AUTOMATED_COLLECTION: ACTIVE
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {MOCK_WORKS.map((work) => (
          <div key={work.id} className="glass-panel rounded-[2.5rem] p-10 border border-white/[0.06] relative group overflow-hidden transition-all duration-700 hover:scale-[1.02] hover:border-white/20 active:scale-95 cursor-default">
            {/* Context Header */}
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black tracking-[0.2em] uppercase shadow-lg ${
                    work.source === 'Substack' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-black text-white border border-white/10'
                  }`}>
                    {work.source}
                  </span>
                  <span className={`text-[10px] font-bold text-zinc-700 italic`}>{work.date}</span>
               </div>
               <button className="p-3 rounded-xl bg-white/5 text-zinc-600 hover:text-white transition-all group-hover:bg-[#00E5FF] group-hover:text-black group-hover:rotate-45 duration-500">
                  <ArrowUpRight size={18} />
               </button>
            </div>

            {/* Content Logic */}
            <div className="space-y-6 mb-10">
               <h3 className={`text-2xl font-black text-white uppercase leading-tight tracking-wide group-hover:text-[#00E5FF] transition-colors ${outfit.className}`}>{work.title}</h3>
               <p className="text-[14px] text-zinc-500 leading-relaxed font-medium">
                  {work.summary}
               </p>
               <div className="flex flex-wrap gap-2 pt-2">
                  {work.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/5 text-[10px] font-black text-zinc-600 uppercase tracking-widest">{tag}</span>
                  ))}
               </div>
            </div>

            {/* AI Summary Expansion */}
            <div className="p-8 rounded-3xl bg-emerald-500/[0.04] border border-emerald-500/10 relative overflow-hidden group/ai">
               <div className="absolute top-0 right-0 p-8 opacity-0 group-hover/ai:opacity-100 transition-opacity">
                  <Sparkles size={60} className="text-emerald-500/5" />
               </div>
               <div className="flex items-center gap-3 mb-4 text-[11px] font-black text-emerald-400 tracking-[0.3em] uppercase relative z-10 font-sans">
                 <Sparkles size={14} className="animate-pulse" /> Logic_Synthesis
               </div>
               <p className="text-[13px] text-zinc-300 italic leading-relaxed font-semibold relative z-10 px-1 border-l-2 border-emerald-500/20">
                 &quot;{work.summaryAI}&quot;
               </p>
            </div>
          </div>
        ))}

        {/* Visual Vector: Behance / Dribbble Embed Simulation */}
        <div className="glass-panel rounded-[2.5rem] p-10 border border-white/[0.06] flex flex-col min-h-[500px] overflow-hidden group">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Layers size={18} />
                 </div>
                 <h4 className={`text-[11px] font-black text-white tracking-[0.3em] uppercase ${outfit.className}`}>Creative Node // Behance</h4>
              </div>
           </div>
           
           <div className="flex-1 rounded-[2rem] bg-black border border-white/5 relative overflow-hidden group-hover:border-[#00E5FF]/30 transition-all duration-700">
              {/* Simulated Embed Mesh */}
              <div className="absolute inset-0 grid-bg opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                 <Share2 size={50} className="text-zinc-800 mb-6 group-hover:text-blue-500 transition-all group-hover:scale-110 duration-700 group-hover:rotate-12" />
                 <p className="text-[11px] font-black tracking-[0.4em] text-zinc-700 mb-2 uppercase group-hover:text-zinc-500 transition-colors">Behance_Project_Embed</p>
                 <span className={`text-[9px] font-black ${jetBrains.className} text-zinc-800 uppercase`}>v.4.14_ACTIVE_SYNC</span>
              </div>
           </div>
           
           <div className="mt-8 flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase italic">Synced 2h ago</span>
              <button className="text-[10px] font-black text-[#00E5FF] hover:underline uppercase tracking-widest">View_Project</button>
           </div>
        </div>
      </div>
    </div>
  );
};
