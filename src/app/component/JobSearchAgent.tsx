"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Target, Zap, UserCheck, Send, ArrowRight, Fingerprint, Loader2, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { IDENTITY_CONFIG } from '@/config/identity';
import { EmptyState } from '@/components/ui/primitives';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Applied: { label: 'Applied', color: 'bg-accent/10 border-accent/20 text-accent-ink', icon: Zap },
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
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch('/api/blob?type=job_lead&limit=20');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const rows = parseBlobItems<Record<string, unknown>>(data);
      const mapped: Lead[] = rows.map((b) => {
        const trace = (b.trace_json && typeof b.trace_json === 'object' ? b.trace_json : {}) as Record<string, unknown>;
        const payload = (b.raw_payload && typeof b.raw_payload === 'object' ? b.raw_payload : {}) as Record<string, unknown>;
        const meta = { ...trace, ...payload } as Record<string, unknown>;
        return {
          id: String(b.id),
          role: String(meta.role || meta.title || 'Role match'),
          company: String(meta.company || 'Unknown'),
          score: Number(meta.score ?? meta.match_score ?? 0),
          status: String(meta.status || 'Outreach'),
          via: String(meta.via || b.source || 'Agent'),
          date: formatRecency(String(b.created_at || '')),
          url: meta.url ? String(meta.url) : undefined,
        };
      });
      setLeads(mapped);
    } catch {
      setLeads([]);
      setFailed(true);
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
          <h2 className="text-lg font-semibold text-text-primary tracking-tight flex items-center gap-3">
            <Target aria-hidden="true" size={22} className="text-accent" /> Opportunities
          </h2>
          <p className="text-sm text-text-tertiary mt-1">
            Leads and outreach
          </p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-secondary text-text-tertiary hover:text-accent transition-colors"
            aria-label="Refresh leads"
          >
            <RefreshCcw aria-hidden="true" size={15} className={loading ? 'motion-safe:animate-spin' : ''} />
          </button>
          <p className="text-2xs font-semibold text-text-tertiary">{loading ? 'Loading' : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 aria-hidden="true" className="motion-safe:animate-spin text-accent" size={28} />
        </div>
      ) : failed ? (
        <p role="alert" className="px-2 py-8 text-sm text-text-tertiary">Could not load job leads. Use refresh to try again.</p>
      ) : leads.length === 0 ? (
        <EmptyState
          title="No job leads yet"
          hint="Leads you add to the buffer as job leads show up here. Nothing finds them automatically yet."
        />
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
                <article className="glass-panel p-5 md:p-8 rounded-radius-2xl border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
                  <div className="flex items-center justify-between flex-wrap md:flex-nowrap gap-4 md:gap-8 relative z-10">
                    <div className="flex min-w-0 items-center gap-4 md:gap-8">
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <span className="text-2xs font-semibold text-accent-ink">{lead.score > 0 ? `${lead.score}%` : '—'}</span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-text-primary tracking-tight ">
                          {lead.role}
                        </h3>
                        <p className="text-2xs text-text-tertiary font-bold ">
                          {lead.company} · via {lead.via}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:gap-6 md:ml-auto">
                      <span className={`px-4 py-1.5 rounded-full border text-2xs font-semibold flex items-center gap-2 ${statusCfg.color}`}>
                        <StatusIcon size={12} /> {statusCfg.label}
                      </span>
                      {lead.url ? (
                        <a
                          href={lead.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center text-2xs font-semibold text-accent-ink underline"
                        >
                          View posting<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <a
                          href={IDENTITY_CONFIG.LINKEDIN_JOBS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center text-2xs font-semibold text-accent-ink underline"
                        >
                          Find roles<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                      <time className="text-2xs font-mono text-text-tertiary">{lead.date}</time>
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
