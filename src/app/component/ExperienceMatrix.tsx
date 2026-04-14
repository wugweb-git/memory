"use client";
import React from 'react';
import { BookOpen, Award, Zap, ArrowUpRight, Share2, CornerDownRight } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });

const CASE_STUDIES = [
  {
    id: '1',
    title: 'Fintech Disruption 2018',
    company: 'NeoBank Corp',
    industries: ['Fintech', 'UX', 'Product'],
    originalLogic: 'Focused on reducing onboarding friction through progressive disclosure.',
    perspective2026: 'The 2018 friction-reduction logic has evolved into "Intent-Based Anticipatory Design"—where the system predicts user needs before the first click.',
    date: 'March 2018'
  },
  {
    id: '2',
    title: 'AI Middleware Architecture',
    company: 'NeuralSync',
    industries: ['AI', 'Systems Architect', 'Tech/DevOps'],
    originalLogic: 'Built a robust caching layer for LLM responses to reduce latency.',
    perspective2026: 'In 2026, caching is no longer about latency alone, but about "Semantic Alignment Clusters" that ensure cross-model consistency.',
    date: 'Nov 2021'
  }
];

export const ExperienceMatrix = ({ selectedIndustry }: { selectedIndustry?: string }) => {
  const filteredStudies = selectedIndustry 
    ? CASE_STUDIES.filter(s => s.industries.includes(selectedIndustry))
    : CASE_STUDIES;

  return (
    <div className="space-y-12 max-w-6xl mx-auto w-full py-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Experience Matrix</h2>
          <p className="text-zinc-500 text-xs tracking-widest uppercase">Multi-Industry Case Studies // AI Refactored Lessons</p>
        </div>
        {selectedIndustry && (
          <div className="px-3 py-1.5 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[10px] font-black text-[#00E5FF] uppercase">
            FILTER: {selectedIndustry}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-12">
        {filteredStudies.map((study) => (
          <div key={study.id} className="group relative">
            {/* Timeline Marker */}
            <div className="absolute left-[-40px] top-0 bottom-0 w-px bg-white/5 hidden xl:block" />
            <div className="absolute left-[-44px] top-6 w-2 h-2 rounded-full bg-white/10 group-hover:bg-[#00E5FF] transition-colors hidden xl:block" />

            <div className="glass-card rounded-3xl p-8 border border-white/5 hover:border-white/10 transition-all">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                     <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-[#00E5FF] transition-colors">{study.title}</h3>
                        <span className="text-xs text-zinc-600 font-bold bg-white/5 px-2 py-0.5 rounded uppercase">{study.company}</span>
                     </div>
                     <div className="flex gap-2">
                        {study.industries.map(tag => (
                          <span key={tag} className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">{tag}</span>
                        ))}
                     </div>
                  </div>
                  <span className={`text-xs font-bold text-zinc-700 ${jetBrains.className}`}>{study.date}</span>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase flex items-center gap-2">
                        <BookOpen size={12} /> Original Logic Inversion
                     </h4>
                     <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-white/5 pl-4 py-2 italic font-medium">
                        &quot;{study.originalLogic}&quot;
                     </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#00E5FF]/[0.02] border border-[#00E5FF]/10 relative group-hover:bg-[#00E5FF]/[0.05] transition-colors">
                     <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-[#00E5FF] tracking-[0.2em] uppercase">
                        <Zap size={14} fill="currentColor" /> 2026 Perspective (AI_Refactored)
                     </div>
                     <p className="text-zinc-200 text-sm leading-relaxed font-semibold">
                        {study.perspective2026}
                     </p>
                     <CornerDownRight size={24} className="absolute bottom-4 right-4 text-[#00E5FF]/20 group-hover:text-[#00E5FF]/40 transition-colors" />
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
