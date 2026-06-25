"use client";
import React from 'react';
import { Sparkles, Fingerprint, Loader2 } from 'lucide-react';
import { useProfileData } from '@/hooks/useProfileData';

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

function mapSection(s: { id?: string; title?: string; content?: unknown }, index: number): VentureNode {
  const c = (s.content ?? {}) as Record<string, unknown>;
  return {
    id: s.id ?? `v-${index}`,
    name: String(s.title ?? c.name ?? 'Venture'),
    industry: String(c.industry ?? 'General'),
    phase: (c.phase as VentureNode['phase']) ?? 'Scaling',
    role: (c.role as VentureNode['role']) ?? 'Architect',
    logicApplied: String(c.logicApplied ?? c.logic ?? ''),
    legacyLessons: String(c.legacyLessons ?? c.lessons ?? ''),
    perspective2026: String(c.perspective2026 ?? c.perspective ?? ''),
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
  };
}

export const VentureVault = ({ selectedIndustry }: { selectedIndustry?: string }) => {
  const { byType, loading } = useProfileData();
  const ventures = byType('venture').map(mapSection);

  const filtered = selectedIndustry
    ? ventures.filter((v) => v.industry === selectedIndustry)
    : ventures;

  return (
    <section aria-label="Venture vault">
      <div className="flex items-center justify-between px-1 mb-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Venture Vault</h2>
          <p className="text-xs text-text-tertiary font-normal mt-0.5">Product DNA — Legacy Logic Mapping</p>
        </div>
        <button type="button" className="p-2 rounded-xl bg-secondary border border-primary text-text-tertiary" aria-label="Venture vault settings">
          <Fingerprint size={20} aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-text-tertiary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-tertiary  px-1">No ventures in profile. Add sections with type &quot;venture&quot; via profile API.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((v) => (
            <article key={v.id} className="glass-panel rounded-[2rem] p-6 border border-border-secondary space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-text-primary">{v.name}</h3>
                  <p className="text-2xs text-text-tertiary uppercase tracking-widest mt-1">{v.industry} · {v.phase}</p>
                </div>
                <span className="text-2xs font-black px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">{v.role}</span>
              </div>
              <p className="text-xs text-text-secondary ">{v.logicApplied}</p>
              <p className="text-xs text-text-tertiary border-l-2 border-accent/30 pl-3">{v.legacyLessons}</p>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-bg-secondary/50">
                <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
                <p className="text-2xs text-text-secondary">{v.perspective2026}</p>
              </div>
              {v.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {v.tags.map((t) => (
                    <span key={t} className="text-2xs font-bold px-2 py-0.5 rounded bg-secondary border border-border-secondary text-text-tertiary">{t}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
