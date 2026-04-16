"use client";
import React from 'react';
import { BookOpen, Award, Zap, ArrowUpRight, Share2, CornerDownRight, Binary } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="space-y-12 w-full" aria-label="Experience matrix and case studies">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Binary size={22} className="text-accent" /> Logic_Matrix
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">Multi-Industry Case Studies // AI_Refactored Lessons</p>
        </div>
        {selectedIndustry && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="px-4 py-2 rounded-full bg-accent text-[10px] font-black text-bg-primary uppercase tracking-[0.2em] shadow-xl shadow-accent/20"
          >
            FILTER: {selectedIndustry}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10">
        {filteredStudies.map((study, idx) => (
          <motion.div 
            key={study.id} 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
            className="group relative"
          >
            {/* Timeline Marker: Tactical style */}
            <div className="absolute left-[-40px] top-0 bottom-0 w-px bg-gradient-to-b from-border-primary via-border-secondary to-transparent hidden xl:block" />
            <div className="absolute left-[-46px] top-10 w-3 h-3 rounded-full bg-bg-primary border-2 border-border-primary group-hover:border-accent group-hover:scale-125 transition-all duration-500 hidden xl:block z-10 shadow-lg" />

            <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 border border-border-secondary hover:border-border-primary transition-all duration-700 hover:shadow-2xl relative overflow-hidden">
               {/* Accent decoration */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
               
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 relative z-10">
                  <div className="space-y-4">
                     <div className="flex items-center gap-4 flex-wrap">
                        <h3 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic group-hover:text-accent transition-colors kinetic-text">{study.title}</h3>
                        <span className="text-[10px] text-text-tertiary font-black bg-secondary border border-border-secondary px-3 py-1 rounded-full uppercase tracking-widest">{study.company}</span>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {study.industries.map(tag => (
                          <span key={tag} className="text-[9px] font-black text-text-disabled uppercase tracking-[0.2em] border border-border-secondary/50 px-3 py-1 rounded-lg bg-bg-secondary/30 italic">{tag}</span>
                        ))}
                     </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-start lg:items-end">
                     <span className="text-[10px] font-black text-text-disabled uppercase tracking-[0.3em] mb-1">Temporal_Node</span>
                     <span className="text-xs font-black text-text-tertiary font-mono italic">{study.date}</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-4 p-6 rounded-[1.5rem] bg-secondary/20 border border-border-secondary group-hover:bg-secondary/40 transition-colors">
                     <h4 className="text-[10px] font-black text-text-tertiary tracking-[0.25em] uppercase flex items-center gap-3">
                        <BookOpen size={14} className="text-text-disabled" /> Original_Inversion
                     </h4>
                     <p className="text-[13px] text-text-secondary leading-relaxed border-l-2 border-border-primary pl-5 py-2 font-medium italic italic">
                        &ldquo;{study.originalLogic}&rdquo;
                     </p>
                  </div>

                  <div className="p-8 rounded-[1.5rem] bg-accent/5 border border-accent/20 relative group-hover:bg-accent/10 transition-all duration-500 shadow-inner group/logic">
                     <div className="flex items-center gap-3 mb-4 text-[10px] font-black text-accent tracking-[0.3em] uppercase">
                        <Zap size={16} fill="currentColor" className="animate-pulse" /> 2026_Refactored_Logic
                     </div>
                     <p className="text-text-primary text-sm leading-relaxed font-bold tracking-tight italic">
                        {study.perspective2026}
                     </p>
                     <CornerDownRight size={28} className="absolute bottom-6 right-6 text-accent/20 group-hover/logic:text-accent/40 group-hover/logic:translate-x-1 group-hover/logic:translate-y-1 transition-all duration-500" />
                  </div>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
