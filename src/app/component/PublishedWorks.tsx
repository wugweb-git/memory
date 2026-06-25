"use client";
import React, { useEffect, useState } from 'react';
import { BookOpen, Share2, Sparkles, ArrowUpRight, Globe, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { IDENTITY_CONFIG, resolveUserId } from '@/config/identity';
import { useProfileData } from '@/hooks/useProfileData';

type Work = {
  id: string;
  title: string;
  source: string;
  summary: string;
  tags: string[];
  url: string;
  summaryAI: string;
  date: string;
};

export const PublishedWorks = () => {
  const { byType, loading: profileLoading } = useProfileData();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { userId } = resolveUserId();
        const res = await fetch(`/api/output/history?userId=${encodeURIComponent(userId)}`);
        const history = res.ok ? await res.json() : [];
        const fromOutput: Work[] = (Array.isArray(history) ? history : []).map((h: Record<string, unknown>) => ({
          id: String(h.id ?? crypto.randomUUID()),
          title: String(h.title ?? h.topic ?? 'Published output'),
          source: String(h.channel ?? h.platform ?? 'Output'),
          summary: String(h.excerpt ?? h.content ?? '').slice(0, 160),
          tags: Array.isArray(h.tags) ? (h.tags as string[]) : [],
          url: String(h.url ?? h.publishUrl ?? IDENTITY_CONFIG.PORTFOLIO_URL),
          summaryAI: String(h.summary ?? h.reasoning ?? 'Grounded in verified memory clusters.'),
          date: h.createdAt ? new Date(String(h.createdAt)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—',
        }));

        const fromProfile = [...byType('published'), ...byType('blog'), ...byType('reference')].map((s, i) => {
          const c = (s.content ?? {}) as Record<string, unknown>;
          return {
            id: s.id ?? `profile-${i}`,
            title: String(s.title ?? c.title ?? 'Untitled'),
            source: String(c.source ?? 'Profile'),
            summary: String(c.summary ?? c.description ?? ''),
            tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
            url: String(c.url ?? IDENTITY_CONFIG.PORTFOLIO_URL),
            summaryAI: String(c.synthesis ?? c.summaryAI ?? ''),
            date: String(c.date ?? '—'),
          };
        });

        if (!cancelled) setWorks([...fromOutput, ...fromProfile].slice(0, 8));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [byType, profileLoading]);

  return (
    <section className="space-y-10 w-full" aria-label="Published works">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter  flex items-center gap-3">
            <BookOpen size={22} className="text-accent" /> Works_Matrix
          </h2>
          <p className="text-2xs text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">
            Thought Leadership — External Content Stream
          </p>
        </div>
        <div className="px-5 py-2 rounded-full bg-secondary border border-border-secondary text-2xs font-black text-text-tertiary flex items-center gap-3 uppercase tracking-widest shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {loading ? 'Syncing…' : `${works.length} Works`}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-tertiary">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : works.length === 0 ? (
        <p className="text-sm text-text-tertiary  px-2">No published works indexed yet. Generate output or add profile sections.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {works.map((work, idx) => (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={work.id}
              className="glass-panel rounded-[2rem] p-8 border border-border-secondary group transition-all duration-700 hover:border-accent/40 hover:shadow-2xl relative overflow-hidden"
            >
              <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <span className="px-4 py-1.5 rounded-full text-2xs font-black tracking-[0.2em] uppercase border border-border-secondary bg-bg-secondary text-text-secondary shadow-sm">
                    {work.source}
                  </span>
                  <time dateTime={work.date} className="text-2xs text-text-disabled font-mono font-bold uppercase tracking-widest ">
                    {work.date}
                  </time>
                </div>
                <a
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open: ${work.title}`}
                  className="w-10 h-10 rounded-2xl bg-bg-elevated border border-border-primary text-text-tertiary hover:text-bg-primary hover:bg-black transition-all duration-500 flex items-center justify-center shadow-lg"
                >
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </header>

              <div className="space-y-6 mb-8">
                <h3 className="text-xl font-black text-text-primary tracking-tighter leading-none">{work.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed font-medium line-clamp-2 ">{work.summary}</p>
                {work.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {work.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-lg bg-bg-secondary border border-border-secondary text-2xs font-black font-mono text-text-tertiary uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {work.summaryAI && (
                <div className="p-6 rounded-[1.5rem] bg-bg-secondary/40 border border-border-primary">
                  <div className="flex items-center gap-3 mb-3 text-2xs font-black text-success tracking-[0.3em] uppercase">
                    <Sparkles size={13} className="animate-pulse" /> Logic Synthesis
                  </div>
                  <p className="text-xs text-text-secondary  leading-relaxed border-l-2 border-success/30 pl-4">
                    &ldquo;{work.summaryAI}&rdquo;
                  </p>
                </div>
              )}
            </motion.article>
          ))}

          <article className="glass-panel rounded-[2.5rem] p-10 border border-border-secondary shadow-2xl flex flex-col min-h-[280px]">
            <header className="flex items-center gap-4 mb-6">
              <Globe size={20} className="text-text-tertiary" />
              <div>
                <h3 className="text-xs font-black text-text-primary tracking-[0.3em] uppercase">Creative_Node</h3>
                <p className="text-2xs font-bold text-text-disabled uppercase mt-1">Behance / Portfolio sync</p>
              </div>
            </header>
            <a
              href={IDENTITY_CONFIG.PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto px-6 py-2.5 rounded-full bg-black text-bg-primary text-2xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl inline-flex items-center gap-2 w-fit"
            >
              <Share2 size={14} /> Launch Portfolio
            </a>
          </article>
        </div>
      )}
    </section>
  );
};
