"use client";
import React from 'react';
import { 
  Briefcase, Mail, Chrome, Clock, AlertCircle, 
  CheckCircle2, MoreHorizontal, ArrowRight, 
  Target, Send, UserCheck, Zap, Fingerprint
} from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });

const MOCK_LEADS = [
  { id: '1', role: 'Principle Systems Architect', company: 'Solana Labs', score: 94, status: 'Applied', via: 'Indeed Agent', date: '2h ago' },
  { id: '2', role: 'Staff UX Product Designer', company: 'Revolut', score: 88, status: 'Interviewing', via: 'LinkedIn Agent', date: '1d ago' },
  { id: '3', role: 'AI Engineering Lead', company: 'Anthropic', score: 91, status: 'Outreach', via: 'Direct Parser', date: '3h ago' },
];

export const JobSearchAgent = () => {
  return (
    <div className="space-y-10 max-w-6xl mx-auto w-full py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 uppercase tracking-[0.1em]">Job Search Agent</h2>
          <p className="text-zinc-500 text-xs tracking-widest uppercase text-left">Proactive Neural Matching // Outreach Log</p>
        </div>
        <div className="flex gap-4">
           <div className="px-3 py-1.5 rounded-lg bg-orange-500/5 border border-orange-500/10 text-[10px] font-black text-orange-500 flex items-center gap-2">
             <Target size={12} /> AGENT_SYNC: NOMINAL
           </div>
           <div className="px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-black text-emerald-400 flex items-center gap-2">
             <Zap size={12} /> {MOCK_LEADS.length} HIGH_MATCH_FOUND
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MOCK_LEADS.map((lead) => (
          <div key={lead.id} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group lg:p-8">
            <div className="flex items-center justify-between flex-wrap gap-8">
               <div className="flex items-center gap-6">
                  {/* Lead Score Radial Mock */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-16 h-16 -rotate-90">
                       <circle cx="32" cy="32" r="30" fill="transparent" stroke="rgba(0, 229, 255, 0.05)" strokeWidth="4" />
                       <circle cx="32" cy="32" r="30" fill="transparent" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="4" strokeDasharray={`${(lead.score / 100) * 188.4} 188.4`} strokeLinecap="round" />
                    </svg>
                    <span className={`absolute text-[11px] font-black ${jetBrains.className} text-[#00E5FF]`}>{lead.score}%</span>
                  </div>

                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">{lead.role}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">{lead.company} // <span className="text-zinc-600 italic">via {lead.via}</span></p>
                  </div>
               </div>

               <div className="flex items-center gap-10 flex-1 justify-end min-w-[300px]">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-zinc-600 tracking-widest uppercase mb-1">Outreach Status</span>
                    <div className="flex items-center gap-2">
                       {lead.status === 'Applied' && <span className="px-2 py-0.5 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[9px] font-black text-[#00E5FF] uppercase">SYNCED</span>}
                       {lead.status === 'Interviewing' && <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5"><UserCheck size={10} /> LIVE</span>}
                       {lead.status === 'Outreach' && <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-400 uppercase flex items-center gap-1.5 animate-pulse"><Send size={10} /> PENDING</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end border-l border-white/5 pl-10">
                    <span className="text-[9px] font-bold text-zinc-600 tracking-widest uppercase mb-1">Generated Pitch</span>
                    <button className="text-[9px] font-black tracking-widest text-[#00E5FF]/60 hover:text-[#00E5FF] transition-colors border-b border-white/10 italic">
                       VIEW_CUSTOM_EPHEMERAL_LINK
                    </button>
                  </div>

                  <div className="flex flex-col items-end min-w-[100px] border-l border-white/5 pl-10">
                    <span className="text-[9px] font-bold text-zinc-600 tracking-widest uppercase mb-1">Recency</span>
                    <span className={`text-[10px] font-bold text-zinc-700 italic`}>{lead.date}</span>
                  </div>

                  <button className="p-3 rounded-xl hover:bg-white/5 text-zinc-600 hover:text-white transition-colors">
                    <ArrowRight size={18} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-[#0A0A0A] to-transparent relative group overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <Fingerprint size={100} className="text-[#00E5FF]/5" />
         </div>
         <h4 className="text-[10px] font-black tracking-[0.4em] text-white flex items-center gap-3 uppercase mb-6">
            <Send size={14} className="text-[#00E5FF]" /> Outreach Strategy // Claude Inference
         </h4>
         <p className="text-zinc-500 text-xs leading-relaxed max-w-2xl font-medium">
            Every lead is analyzed against your 11+ industry clusters. If a match score exceeds 85%, the system drafts a role-specific bio using your &quot;Venture DNA&quot; (Phase & Logic Transfer) and creates an ephemeral pitch link for recruiters.
         </p>
      </div>
    </div>
  );
};
