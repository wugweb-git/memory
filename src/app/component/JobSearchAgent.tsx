"use client";
import React from 'react';
import { Target, Zap, UserCheck, Send, ArrowRight, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_LEADS = [
  { id: '1', role: 'Principal Systems Architect', company: 'Solana Labs', score: 94, status: 'Applied', via: 'Indeed Agent', date: '2h ago' },
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
    <section className="space-y-10 w-full" aria-label="Job search agent proactive outreach">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Target size={22} className="text-accent" /> Opportunity_Agent
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">Proactive Neural Matching — Outreach Matrix</p>
        </div>
        <div className="flex gap-4">
          <div className="px-5 py-2.5 rounded-full bg-secondary border border-border-secondary text-[10px] font-black text-text-tertiary flex items-center gap-3 uppercase tracking-widest shadow-sm">
            <Fingerprint size={14} className="text-accent" /> Agent: Nominal
          </div>
          <div className="px-5 py-2.5 rounded-full bg-success/5 border border-success/20 text-[10px] font-black text-success flex items-center gap-3 uppercase tracking-widest shadow-sm">
            <Zap size={14} className="animate-pulse" /> {MOCK_LEADS.length} Matches
          </div>
        </div>
      </div>

      <ul role="list" className="space-y-6">
        {MOCK_LEADS.map((lead, idx) => {
          const statusCfg = STATUS_CONFIG[lead.status];
          const StatusIcon = statusCfg.icon;
          return (
            <motion.li 
              key={lead.id} 
              initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
              role="listitem"
            >
              <article className="glass-panel p-8 rounded-[2.5rem] border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center justify-between flex-wrap md:flex-nowrap gap-8 relative z-10">
                  <div className="flex items-center gap-8">
                    {/* Score meter: Premium Light Style */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-16 h-16 -rotate-90 group-hover:scale-110 transition-transform duration-700" aria-hidden="true">
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="4" />
                        <motion.circle 
                          initial={{ strokeDasharray: "0 175.9" }} animate={{ strokeDasharray: `${(lead.score / 100) * 175.9} 175.9` }}
                          transition={{ duration: 1.5, delay: idx * 0.1, ease: "easeOut" }}
                          cx="32" cy="32" r="28" fill="transparent" 
                          stroke="var(--accent)" strokeWidth="4" 
                          strokeLinecap="round" strokeOpacity="1"
                          className="shadow-[0_0_10px_rgba(0,170,255,0.4)]"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                         <span className="text-[11px] font-black text-accent">{lead.score}%</span>
                         <span className="text-[6px] font-black text-text-disabled uppercase opacity-40">Match</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-text-primary tracking-tighter uppercase italic kinetic-text group-hover:text-accent transition-colors">{lead.role}</h4>
                      <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest italic opacity-60">
                        {lead.company} <span className="opacity-40 ml-2 border-l border-border-secondary pl-2">Sync: {lead.via}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-10 ml-auto md:ml-0 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[9px] font-black text-text-disabled uppercase tracking-[0.3em] mb-2">Matrix_State</span>
                      <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${statusCfg.color}`}>
                        <StatusIcon size={12} strokeWidth={3} aria-hidden="true" /> {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex flex-col items-end shrink-0 border-l border-border-secondary pl-10">
                      <span className="text-[9px] font-black text-text-disabled uppercase tracking-[0.3em] mb-2">Neural_Pitch</span>
                      <button className="text-[10px] font-black text-accent hover:scale-110 active:scale-95 transition-all uppercase tracking-[0.2em] italic underline decoration-accent/30 decoration-2 underline-offset-4">
                        View_Nexus
                      </button>
                    </div>

                    <div className="flex flex-col items-end shrink-0 border-l border-border-secondary pl-10">
                      <span className="text-[9px] font-black text-text-disabled uppercase tracking-[0.3em] mb-2">Recency</span>
                      <time dateTime={lead.date} className="text-[10px] font-black font-mono text-text-tertiary uppercase italic tracking-tighter opacity-60">{lead.date}</time>
                    </div>

                    <button className="w-11 h-11 rounded-2xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-bg-primary hover:bg-black transition-all flex items-center justify-center shadow-lg active:scale-90 ml-4 group-hover:rotate-12">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </article>
            </motion.li>
          );
        })}
      </ul>

      {/* Strategy Block: Premium Light Card */}
      <div className="glass-panel p-10 rounded-[3rem] border border-border-secondary bg-bg-secondary/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-all duration-700" aria-hidden="true">
          <Fingerprint size={120} className="text-accent" />
        </div>
        <div className="space-y-6 relative z-10">
           <h3 className="text-[10px] font-black tracking-[0.4em] text-text-primary flex items-center gap-4 uppercase kinetic-text">
             <Send size={16} className="text-accent" /> Outreach_Architecture
           </h3>
           <p className="text-base text-text-secondary leading-relaxed max-w-3xl font-medium italic tracking-tight">
             Every lead is analyzed against your industry clusters. If a match score exceeds 85%, the system drafts a role-specific bio using your <span className="text-text-primary font-black uppercase">Venture DNA</span> and creates an ephemeral pitch link for recruiters.
           </p>
           <div className="flex gap-4">
              <div className="px-4 py-2 rounded-xl bg-bg-secondary border border-border-secondary text-[9px] font-black text-text-disabled uppercase tracking-widest italic shadow-inner">Strategy: High_Fidelity_Outreach</div>
              <div className="px-4 py-2 rounded-xl bg-bg-secondary border border-border-secondary text-[9px] font-black text-text-disabled uppercase tracking-widest italic shadow-inner">Model: Claude_3.5_Identity_Parser</div>
           </div>
        </div>
      </div>
    </section>
  );
};
