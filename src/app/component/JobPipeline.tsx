"use client";
import React, { useEffect, useState } from 'react';
import {
  Briefcase, Mail, Chrome, ArrowRight, Loader2, RefreshCcw, AlertCircle, Plus
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
  Applied:      'MATRIX_INGRESS',
  Interviewing: 'SYNC_ACTIVE',
  Rejected:     'NULL_VOID',
  Offer:        'ACCEPTED',
};
const STATUS_COLOR: Record<Application['status'], string> = {
  Applied:      'text-accent',
  Interviewing: 'text-success',
  Rejected:     'text-danger',
  Offer:        'text-success',
};
const ICON_COLOR: Record<Application['status'], string> = {
  Applied:      'bg-bg-secondary border-border-primary text-text-disabled',
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
        const meta = (b.metadata && typeof b.metadata === 'object' ? b.metadata : {}) as Record<string, unknown>;
        const raw = typeof b.raw_payload === 'string' ? b.raw_payload : '';
        return {
          id: String(b.id ?? ''),
          role: String(meta.role ?? (raw.slice(0, 50) || 'Untitled Role')),
          company: String(meta.company ?? 'Unknown'),
          status: (String(meta.status ?? 'Applied') as Application['status']),
          source: String(b.source_origin ?? 'Manual'),
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
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter  flex items-center gap-3">
            <Briefcase size={22} className="text-accent" /> Career_Matrix
          </h2>
          <p className="text-2xs text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">
            Automated Pipeline // Linked_Nexus, Indeed_Reflex
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl border border-border-secondary text-text-disabled hover:text-accent hover:border-accent/30 transition-colors"
            aria-label="Refresh pipeline">
            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="px-4 py-2 rounded-full bg-bg-secondary border border-border-secondary text-2xs font-black text-text-tertiary flex items-center gap-3 shadow-sm">
            <Chrome size={14} className="text-warning" /> BROWSER_SYNC
          </div>
          <div className="px-4 py-2 rounded-full bg-bg-secondary border border-border-secondary text-2xs font-black text-text-tertiary flex items-center gap-3 shadow-sm">
            <Mail size={14} className="text-accent" /> EMAIL_ANCHOR
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-text-disabled">
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-sm">Loading pipeline…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && apps.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-text-disabled">
          <AlertCircle size={32} className="text-danger/40" />
          <p className="text-sm font-medium">Failed to load applications</p>
          <button onClick={load} className="text-accent text-xs font-bold hover:underline">Try again →</button>
        </div>
      )}

      {!loading && !error && apps.length === 0 && (
        <p className="text-sm text-text-tertiary  px-2 py-8">
          No job applications in the buffer yet. Add items with type <code className="text-accent">job_application</code> via Buffer or Universal Sync.
        </p>
      )}

      {/* Application list */}
      {!loading && apps.length > 0 && (
        <div className="space-y-4">
          {apps.map((app, idx) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }}
              className="glass-panel rounded-[2rem] p-6 md:p-8 border border-border-secondary hover:border-border-primary transition-all duration-500 group hover:shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between flex-wrap md:flex-nowrap gap-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:scale-110 ${ICON_COLOR[app.status]}`}>
                    <Briefcase size={20} />
                  </div>
                  <div className="text-left space-y-1">
                    <h4 className="text-lg font-black text-text-primary tracking-tight kinetic-text">{app.role}</h4>
                    <p className="text-2xs text-text-tertiary font-bold uppercase tracking-widest">
                      {app.company}{' // '}
                      <span className="opacity-50 ">via {app.source}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-10 ml-auto overflow-x-auto pb-1 scrollbar-hide">
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-2xs font-black text-text-disabled tracking-[0.3em] uppercase mb-1">Method</span>
                    <span className="text-2xs font-black text-text-tertiary uppercase tracking-widest bg-secondary px-2 py-0.5 rounded border border-border-secondary ">
                      {app.via}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-2xs font-black text-text-disabled tracking-[0.3em] uppercase mb-1">State</span>
                    <span className={`text-2xs font-black uppercase tracking-[0.2em]  ${STATUS_COLOR[app.status]}`}>
                      {STATUS_LABEL[app.status]}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-2xs font-black text-text-disabled tracking-[0.3em] uppercase mb-1">Temporal</span>
                    <span className="text-2xs font-black text-text-tertiary uppercase tracking-widest ">{app.date}</span>
                  </div>
                  {/* Navigate to job URL if available */}
                  {app.url ? (
                    <a href={app.url} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-bg-primary hover:bg-black transition-all flex items-center justify-center shadow-md active:scale-90"
                      aria-label={`View ${app.role} at ${app.company}`}>
                      <ArrowRight size={18} />
                    </a>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-secondary border border-border-secondary text-text-disabled flex items-center justify-center cursor-not-allowed opacity-40">
                      <ArrowRight size={18} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add entry */}
          <button
            onClick={() => window.open(IDENTITY_CONFIG.LINKEDIN_JOBS_URL, '_blank')}
            className="w-full glass-panel rounded-[2rem] p-6 border-2 border-dashed border-border-secondary hover:border-accent/40 hover:shadow-xl transition-all flex items-center justify-center gap-3 text-text-disabled hover:text-accent group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            <span className="text-2xs font-black uppercase tracking-widest">Add Application</span>
          </button>
        </div>
      )}

      {/* Stats bento — derived from real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-secondary/30 p-8 rounded-[2rem] border border-border-primary border-dashed relative overflow-hidden">
        <div className="absolute top-0 right-1/2 bottom-0 w-px bg-gradient-to-b from-transparent via-border-primary to-transparent hidden md:block" />

        <div className="flex items-center gap-6 group">
          <div className="w-16 h-16 rounded-2xl bg-bg-primary shadow-xl border border-border-secondary flex items-center justify-center text-3xl font-black text-text-primary group-hover:scale-110 transition-transform">
            {loading ? '…' : activeCount}
          </div>
          <div>
            <span className="text-2xs font-black text-text-tertiary tracking-[0.2em] uppercase block mb-1">Active_Ingress</span>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-tighter leading-snug ">
              Applications Captured<br />this weekly cycle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 group">
          <div className="w-16 h-16 rounded-2xl bg-success text-bg-primary shadow-xl shadow-success/20 flex items-center justify-center text-3xl font-black group-hover:scale-110 transition-transform">
            {loading ? '…' : interviewCount}
          </div>
          <div>
            <span className="text-2xs font-black text-success tracking-[0.2em] uppercase block mb-1">Live_Synapse</span>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-tighter leading-snug ">
              Interviews Scheduled<br />via Neural Parser
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
