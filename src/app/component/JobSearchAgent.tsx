"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Target, Zap, UserCheck, Send, ArrowRight, Fingerprint, Loader2, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { IDENTITY_CONFIG } from '@/config/identity';
import { parseBlobItems } from '@/lib/ui/blob';

type Lead = {
  id: string;
  role: string;
  company: string;
  score: number;
  status: string;
  via: string;
  date: string;
  url?: string;
};

const SEED: Lead[] = [
  { id: 'seed-1', role: 'Principal Systems Architect', company: 'Solana Labs', score: 94, status: 'Applied', via: 'Indeed Agent', date: '2h ago' },
  { id: 'seed-2', role: 'Staff UX Product Designer', company: 'Revolut', score: 88, status: 'Interviewing', via: 'LinkedIn Agent', date: '1d ago' },
  { id: 'seed-3', role: 'AI Engineering Lead', company: 'Anthropic', score: 91, status: 'Outreach', via: 'Direct Parser', date: '3h ago' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Applied: { label: 'Applied', color: 'bg-accent/10 border-accent/20 text-accent', icon: Zap },
  Interviewing: { label: 'Live', color: 'bg-success/10 border-success/20 text-success', icon: UserCheck },
  Outreach: { label: 'Pending', color: 'bg-warning/10 border-warning/20 text-warning', icon: Send },
};

function formatRecency(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const JobSearchAgent = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blob?type=job_lead&limit=20');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const rows = parseBlobItems<Record<string, unknown>>(data);
      const mapped: Lead[] = rows.map((b) => {
        const meta = (b.metadata ?? {}) as Record<string, unknown>;
        return {
          id: String(b.id),
          role: String(meta.role || meta.title || 'Role match'),
          company: String(meta.company || 'Unknown'),
          score: Number(meta.score ?? meta.match_score ?? 85),
          status: String(meta.status || 'Outreach'),
          via: String(meta.via || b.source || 'Agent'),
          date: formatRecency(String(b.created_at || '')),
          url: meta.url ? String(meta.url) : undefined,
        };
      });
      setLeads(mapped.length > 0 ? mapped : SEED);
    } catch {
      setLeads(SEED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-10 w-full" aria-label="Job search agent proactive outreach">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <Target size={22} className="text-accent" /> Opportunities
          </h2>
          <p className="text-2xs font-bold uppercase tracking-widest text-text-tertiary mt-1">
            Leads &amp; outreach
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-border-secondary text-text-disabled hover:text-accent transition-colors"
            aria-label="Refresh leads"
          >
            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="px-5 py-2.5 rounded-full bg-secondary border border-border-secondary text-2xs font-black text-text-tertiary flex items-center gap-3 uppercase tracking-widest shadow-sm">
            <Fingerprint size={14} className="text-accent" /> Agent: Nominal
          </div>
          <div className="px-5 py-2.5 rounded-full bg-success/5 border border-success/20 text-2xs font-black text-success flex items-center gap-3 uppercase tracking-widest shadow-sm">
            <Zap size={14} className="animate-pulse" /> {leads.length} Matches
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      ) : (
        <ul role="list" className="space-y-6">
          {leads.map((lead, idx) => {
            const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.Outreach;
            const StatusIcon = statusCfg.icon;
            return (
              <motion.li
                key={lead.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                role="listitem"
              >
                <article className="glass-panel p-8 rounded-[2.5rem] border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
                  <div className="flex items-center justify-between flex-wrap md:flex-nowrap gap-8 relative z-10">
                    <div className="flex items-center gap-8">
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <span className="text-2xs font-black text-accent">{lead.score}%</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-text-primary tracking-tighter ">
                          {lead.role}
                        </h4>
                        <p className="text-2xs text-text-tertiary font-bold uppercase tracking-widest  opacity-60">
                          {lead.company} · Sync: {lead.via}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 ml-auto">
                      <span className={`px-4 py-1.5 rounded-full border text-2xs font-black uppercase tracking-widest flex items-center gap-2 ${statusCfg.color}`}>
                        <StatusIcon size={12} /> {statusCfg.label}
                      </span>
                      {lead.url ? (
                        <a
                          href={lead.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xs font-black text-accent uppercase tracking-widest hover:underline"
                        >
                          View_Nexus
                        </a>
                      ) : (
                        <a
                          href={IDENTITY_CONFIG.LINKEDIN_JOBS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xs font-black text-accent uppercase tracking-widest hover:underline"
                        >
                          Find_Roles
                        </a>
                      )}
                      <time className="text-2xs font-mono text-text-tertiary">{lead.date}</time>
                      <button
                        type="button"
                        className="w-11 h-11 rounded-2xl bg-bg-elevated border border-border-secondary flex items-center justify-center hover:bg-black hover:text-bg-primary transition-all"
                        aria-label="Open lead"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                </article>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
