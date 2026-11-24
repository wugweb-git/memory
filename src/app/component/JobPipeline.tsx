"use client";
import React, { useEffect, useState } from 'react';
import {
  Briefcase, ArrowRight, Loader2, RefreshCcw, AlertCircle, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { IDENTITY_CONFIG } from '@/config/identity';
import { parseBlobItems } from '@/lib/ui/blob';

interface Application {
  id: string;
  role: string;
  company: string;
  status: 'Applied' | 'Interviewing' | 'Rejected' | 'Offer';
  source: string;
  via: string;
  date: string;
  url?: string;
}

const STATUS_LABEL: Record<Application['status'], string> = {
  Applied:      'Applied',
  Interviewing: 'Interviewing',
  Rejected:     'Rejected',
  Offer:        'Offer',
};
const STATUS_COLOR: Record<Application['status'], string> = {
  Applied:      'text-accent-ink',
  Interviewing: 'text-success',
  Rejected:     'text-danger',
  Offer:        'text-success',
};
const ICON_COLOR: Record<Application['status'], string> = {
  Applied:      'bg-bg-secondary border-border-primary text-text-tertiary',
  Interviewing: 'bg-success/5 border-success/20 text-success',
  Rejected:     'bg-danger/5 border-danger/20 text-danger',
  Offer:        'bg-success/10 border-success/30 text-success',
};

export const JobPipeline = () => {
  const [apps, setApps]     = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      /* Fetch job applications stored in blob or memory */
      const res = await fetch('/api/blob?type=job_application');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows = parseBlobItems(data);

      const apiApps: Application[] = rows.map((b: Record<string, unknown>) => {
        const payload = b.raw_payload && typeof b.raw_payload === 'object' ? (b.raw_payload as Record<string, unknown>) : {};
        const trace = b.trace_json && typeof b.trace_json === 'object' ? (b.trace_json as Record<string, unknown>) : {};
        const meta = { ...trace, ...payload } as Record<string, unknown>;
        const raw = typeof b.raw_payload === 'string' ? b.raw_payload : '';
        return {
          id: String(b.id ?? ''),
          role: String(meta.role ?? (raw.slice(0, 50) || 'Untitled Role')),
          company: String(meta.company ?? 'Unknown'),
          status: (String(meta.status ?? 'Applied') as Application['status']),
          source: String(b.source ?? 'Manual'),
          via: String(meta.via ?? 'Manual'),
          date: b.created_at ? new Date(String(b.created_at)).toLocaleDateString() : '—',
          url: meta.url ? String(meta.url) : undefined,
        };
      });

      setApps(apiApps);
    } catch {
      setError(true);
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeCount      = apps.filter(a => a.status === 'Applied').length;
  const interviewCount   = apps.filter(a => a.status === 'Interviewing').length;

  return (
    <div className="space-y-10 w-full" aria-label="Job applications pipeline">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-lg font-semibold text-text-primary tracking-tight flex items-center gap-3">
            <Briefcase aria-hidden="true" size={22} className="text-accent" /> Applications
          </h2>
          <p className="text-2xs font-bold uppercase tracking-widest text-text-tertiary mt-1">
            Pipeline &amp; status
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={load} disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-secondary text-text-tertiary hover:text-accent hover:border-accent/30 transition-colors"
            aria-label="Refresh pipeline">
            <RefreshCcw aria-hidden="true" size={15} className={loading ? 'motion-safe:animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-text-tertiary">
          <Loader2 aria-hidden="true" size={20} className="motion-safe:animate-spin text-accent" />
          <span className="text-sm">Loading pipeline…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && apps.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-text-tertiary">
          <AlertCircle aria-hidden="true" size={32} className="text-danger/40" />
          <p className="text-sm font-medium">Failed to load applications</p>
          <button onClick={load} className="min-h-11 px-2 text-accent-ink text-sm font-bold underline">Try again →</button>
        </div>
      )}

      {!loading && !error && apps.length === 0 && (
        <p className="text-sm text-text-tertiary  px-2 py-8">
          No job applications in the buffer yet. Applications appear here when buffer items of type <code className="text-accent-ink">job_application</code> exist. Nothing in the app creates them automatically yet, so they must be added to the buffer by hand or by an external tool.
        </p>
      )}

      {/* Application list */}
      {!loading && apps.length > 0 && (
        <div className="space-y-4">
          {apps.map((app, idx) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }}
              className="glass-panel rounded-radius-xl p-6 md:p-8 border border-border-secondary hover:border-border-primary transition-all duration-500 group hover:shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between flex-wrap md:flex-nowrap gap-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:scale-110 ${ICON_COLOR[app.status]}`}>
                    <Briefcase aria-hidden="true" size={20} />
                  </div>
                  <div className="text-left space-y-1">
                    <h3 className="text-lg font-semibold text-text-primary tracking-tight kinetic-text">{app.role}</h3>
                    <p className="text-2xs text-text-tertiary font-bold">
                      {app.company}{' // '}
                      <span className="opacity-50 ">via {app.source}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-10 ml-auto overflow-x-auto pb-1 scrollbar-hide">
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-2xs font-semibold text-text-tertiary tracking-widest uppercase mb-1">Method</span>
                    <span className="text-2xs font-semibold text-text-tertiary bg-secondary px-2 py-0.5 rounded border border-border-secondary ">
                      {app.via}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-2xs font-semibold text-text-tertiary tracking-widest uppercase mb-1">State</span>
                    <span className={`text-2xs font-semibold  ${STATUS_COLOR[app.status]}`}>
                      {STATUS_LABEL[app.status]}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-2xs font-semibold text-text-tertiary tracking-widest uppercase mb-1">Temporal</span>
                    <span className="text-2xs font-semibold text-text-tertiary ">{app.date}</span>
                  </div>
                  {/* Navigate to job URL if available */}
                  {app.url ? (
                    <a href={app.url} target="_blank" rel="noopener noreferrer"
                      className="w-11 h-11 rounded-xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-bg-primary hover:bg-text-primary transition-all flex items-center justify-center shadow-md active:scale-90"
                      aria-label={`View ${app.role} at ${app.company} (opens in a new tab)`}>
                      <ArrowRight aria-hidden="true" size={18} />
                    </a>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add entry */}
          <button
            onClick={() => window.open(IDENTITY_CONFIG.LINKEDIN_JOBS_URL, '_blank')}
            className="w-full min-h-11 glass-panel rounded-radius-xl p-6 border-2 border-dashed border-border-secondary hover:border-accent/40 hover:shadow-xl transition-all flex items-center justify-center gap-3 text-text-tertiary hover:text-accent group"
          >
            <Plus aria-hidden="true" size={18} className="group-hover:rotate-90 transition-transform" />
            <span className="text-2xs font-semibold">Add Application<span className="sr-only"> (opens in a new tab)</span></span>
          </button>
        </div>
      )}

      {/* Stats bento — derived from real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-secondary/30 p-8 rounded-radius-xl border border-border-primary border-dashed relative overflow-hidden">
        <div className="absolute top-0 right-1/2 bottom-0 w-px bg-gradient-to-b from-transparent via-border-primary to-transparent hidden md:block" />

        <div className="flex items-center gap-6 group">
          <div className="w-16 h-16 rounded-2xl bg-bg-primary shadow-xl border border-border-secondary flex items-center justify-center text-3xl font-semibold text-text-primary group-hover:scale-110 transition-transform">
            {loading ? '…' : activeCount}
          </div>
          <div>
            <span className="text-2xs font-semibold text-text-tertiary tracking-widest uppercase block mb-1">Applications</span>
            <p className="text-xs font-bold text-text-secondary tracking-tight leading-snug ">
              Applications Captured<br />this weekly cycle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 group">
          <div className="w-16 h-16 rounded-2xl bg-success text-bg-primary shadow-xl shadow-success/20 flex items-center justify-center text-3xl font-semibold group-hover:scale-110 transition-transform">
            {loading ? '…' : interviewCount}
          </div>
          <div>
            <span className="text-2xs font-semibold text-success tracking-widest uppercase block mb-1">Interviews</span>
            <p className="text-xs font-bold text-text-secondary tracking-tight leading-snug ">
              Interviews scheduled<br />from captured leads
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
