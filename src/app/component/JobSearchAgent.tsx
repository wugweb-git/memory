"use client";
import React from 'react';
import { Target, Zap, UserCheck, Send, ArrowRight, Fingerprint } from 'lucide-react';

const MOCK_LEADS = [
  { id: '1', role: 'Principle Systems Architect', company: 'Solana Labs', score: 94, status: 'Applied', via: 'Indeed Agent', date: '2h ago' },
  { id: '2', role: 'Staff UX Product Designer', company: 'Revolut', score: 88, status: 'Interviewing', via: 'LinkedIn Agent', date: '1d ago' },
  { id: '3', role: 'AI Engineering Lead', company: 'Anthropic', score: 91, status: 'Outreach', via: 'Direct Parser', date: '3h ago' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Applied: { label: 'Applied', color: 'bg-accent/10 border-accent/20 text-accent', icon: Zap },
  Interviewing: { label: 'Live', color: 'bg-success/10 border-success/20 text-success', icon: UserCheck },
  Outreach: { label: 'Pending', color: 'bg-warning/10 border-warning/20 text-warning', icon: Send },
};

export const JobSearchAgent = () => {
  return (
    <section className="space-y-6 max-w-5xl mx-auto w-full" aria-label="Job search agent">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Job Search Agent</h2>
          <p className="text-xs text-text-tertiary font-normal mt-1 uppercase tracking-wider">Proactive Neural Matching — Outreach Log</p>
        </div>
        <div className="flex gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-secondary border border-primary text-[10px] font-bold text-text-secondary flex items-center gap-2">
            <Target size={11} className="text-accent" aria-hidden="true" /> Agent: Nominal
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-[10px] font-bold text-success flex items-center gap-2">
            <Zap size={11} aria-hidden="true" /> {MOCK_LEADS.length} Matches
          </span>
        </div>
      </div>

      <ul role="list" className="space-y-3">
        {MOCK_LEADS.map((lead) => {
          const statusCfg = STATUS_CONFIG[lead.status];
          const StatusIcon = statusCfg.icon;
          return (
            <li key={lead.id} role="listitem">
              <article className="glass-card p-5 rounded-2xl border border-primary hover:border-primary/50 transition-all group">
                <div className="flex items-center justify-between flex-wrap gap-5">
                  <div className="flex items-center gap-5">
                    {/* Score meter */}
                    <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                      <svg className="w-14 h-14 -rotate-90" aria-hidden="true">
                        <circle cx="28" cy="28" r="24" fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="3" />
                        <circle 
                          cx="28" cy="28" r="24" fill="transparent" 
                          stroke="var(--accent)" strokeWidth="3" 
                          strokeDasharray={`${(lead.score / 100) * 150.7} 150.7`} 
                          strokeLinecap="round" strokeOpacity="0.6"
                        />
                      </svg>
                      <span 
                        className="absolute text-[11px] font-mono font-bold text-accent"
                        aria-label={`Match score: ${lead.score}%`}
                      >{lead.score}%</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-text-primary tracking-tight">{lead.role}</h4>
                      <p className="text-xs text-text-tertiary font-normal mt-0.5">
                        {lead.company} <span className="text-text-disabled">— via {lead.via}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-1 justify-end">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Status</span>
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${statusCfg.color}`}>
                        <StatusIcon size={10} aria-hidden="true" /> {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex flex-col items-end border-l border-primary pl-6">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Pitch</span>
                      <button className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest focus-ring" aria-label={`View custom pitch for ${lead.role} at ${lead.company}`}>
                        View Link
                      </button>
                    </div>

                    <div className="flex flex-col items-end border-l border-primary pl-6">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Recency</span>
                      <time dateTime={lead.date} className="text-[10px] font-mono text-text-secondary">{lead.date}</time>
                    </div>

                    <button className="p-2.5 rounded-xl bg-secondary border border-primary text-text-tertiary hover:text-text-primary transition-colors focus-ring" aria-label={`View ${lead.role} at ${lead.company} details`}>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* Strategy block */}
      <div className="p-6 rounded-2xl border border-primary bg-secondary/30 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5" aria-hidden="true">
          <Fingerprint size={80} className="text-accent" />
        </div>
        <h3 className="text-xs font-bold tracking-widest text-text-primary flex items-center gap-3 uppercase mb-4">
          <Send size={13} className="text-accent" aria-hidden="true" /> Outreach Strategy
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl font-normal">
          Every lead is analyzed against your industry clusters. If a match score exceeds 85%, the system drafts a role-specific bio using your Venture DNA and creates an ephemeral pitch link for recruiters.
        </p>
      </div>
    </section>
  );
};
