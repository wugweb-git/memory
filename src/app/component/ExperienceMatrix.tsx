"use client";
import React from 'react';
import { Award, Zap, Binary, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProfileData } from '@/hooks/useProfileData';

type CaseStudy = {
  id: string;
  title: string;
  company: string;
  industries: string[];
  originalLogic: string;
  perspective2026: string;
  date: string;
};

function mapSection(s: { id?: string; title?: string; content?: unknown }, index: number): CaseStudy {
  const c = (s.content ?? {}) as Record<string, unknown>;
  const industries = Array.isArray(c.industries)
    ? (c.industries as string[])
    : typeof c.industry === 'string'
      ? [c.industry]
      : ['General'];
  return {
    id: s.id ?? `exp-${index}`,
    title: String(s.title ?? c.title ?? 'Case Study'),
    company: String(c.company ?? c.organization ?? '—'),
    industries,
    originalLogic: String(c.originalLogic ?? c.logic ?? ''),
    perspective2026: String(c.perspective2026 ?? c.perspective ?? ''),
    date: String(c.date ?? '—'),
  };
}

export const ExperienceMatrix = ({ selectedIndustry }: { selectedIndustry?: string }) => {
  const { byType, loading } = useProfileData();
  const studies = byType('experience').map(mapSection);

  const filteredStudies = selectedIndustry
    ? studies.filter((s) => s.industries.includes(selectedIndustry))
    : studies;

  return (
    <div className="space-y-12 w-full" aria-label="Experience matrix and case studies">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
            <Binary size={22} className="text-accent" /> Logic_Matrix
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">
            Multi-Industry Case Studies
          </p>
        </div>
        {selectedIndustry && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-4 py-2 rounded-full bg-accent text-[10px] font-black text-bg-primary uppercase tracking-[0.2em] shadow-xl"
          >
            FILTER: {selectedIndustry}
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-text-tertiary" size={28} /></div>
      ) : filteredStudies.length === 0 ? (
        <p className="text-sm text-text-tertiary italic px-2">No experience sections yet. Add profile sections with type &quot;experience&quot;.</p>
      ) : (
        <div className="space-y-8">
          {filteredStudies.map((study, idx) => (
            <motion.article
              key={study.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="glass-panel p-8 rounded-[2rem] border border-border-secondary"
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Award size={16} className="text-accent" />
                <h3 className="text-lg font-black text-text-primary">{study.title}</h3>
                <span className="text-[10px] text-text-disabled font-mono">{study.company} · {study.date}</span>
              </div>
              <p className="text-sm text-text-secondary mb-4">{study.originalLogic}</p>
              <div className="flex items-start gap-2 p-4 rounded-xl bg-accent/5 border border-accent/20">
                <Zap size={14} className="text-accent shrink-0" />
                <p className="text-xs text-text-secondary italic">{study.perspective2026}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {study.industries.map((ind) => (
                  <span key={ind} className="text-[9px] font-black px-2 py-1 rounded-full bg-secondary border border-border-secondary text-text-tertiary uppercase">
                    {ind}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
};
