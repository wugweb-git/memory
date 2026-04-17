"use client";
import React from 'react';
import { Briefcase, Mail, Chrome, Clock, AlertCircle, CheckCircle2, MoreHorizontal, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_APPLICATIONS = [
  { id: '1', role: 'Principal Systems Architect', company: 'Solana Labs', status: 'Applied', source: 'Indeed', via: 'Extension', date: '2h ago' },
  { id: '2', role: 'Staff UX Product Designer', company: 'Revolut', status: 'Interviewing', source: 'LinkedIn', via: 'Email Sync', date: '1d ago' },
  { id: '3', role: 'AI Engineering Lead', company: 'Anthropic', status: 'Rejected', source: 'Direct', via: 'Manual', date: '3w ago' },
];

export const JobPipeline = () => {
  return (
    <div className="space-y-10 w-full" aria-label="Job applications pipeline">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Briefcase size={22} className="text-accent" /> Career_Matrix
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">Automated Pipeline // Linked_Nexus, Indeed_Reflex</p>
        </div>
        <div className="flex gap-4">
           <div className="px-4 py-2 rounded-full bg-bg-secondary border border-border-secondary text-[10px] font-black text-text-tertiary flex items-center gap-3 shadow-sm">
             <Chrome size={14} className="text-warning" /> BROWSER_SYNC
           </div>
           <div className="px-4 py-2 rounded-full bg-bg-secondary border border-border-secondary text-[10px] font-black text-text-tertiary flex items-center gap-3 shadow-sm">
             <Mail size={14} className="text-accent" /> EMAIL_ANCHOR
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_APPLICATIONS.map((app, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
            key={app.id} 
            className="glass-panel rounded-[2rem] p-6 md:p-8 border border-border-secondary hover:border-border-primary transition-all duration-500 group hover:shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between flex-wrap md:flex-nowrap gap-6 relative z-10">
               <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:scale-110 ${
                    app.status === 'Interviewing' ? 'bg-success/5 border-success/20 text-success' : 
                    app.status === 'Rejected' ? 'bg-danger/5 border-danger/20 text-danger' :
                    'bg-bg-secondary border-border-primary text-text-disabled'
                  }`}>
                    <Briefcase size={20} />
                  </div>
                  <div className="text-left space-y-1">
                    <h4 className="text-lg font-black text-text-primary tracking-tight kinetic-text">{app.role}</h4>
                    <p className="text-[11px] text-text-tertiary font-bold uppercase tracking-widest">{app.company}{' // '}<span className="opacity-50 italic">via {app.source}</span></p>
                  </div>
               </div>

               <div className="flex items-center gap-10 ml-auto md:ml-0 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[9px] font-black text-text-disabled tracking-[0.3em] uppercase mb-1">Method</span>
                    <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest bg-secondary px-2 py-0.5 rounded border border-border-secondary italic">{app.via}</span>
                  </div>
                  <div className="flex flex-col items-end min-w-[120px] shrink-0">
                    <span className="text-[9px] font-black text-text-disabled tracking-[0.3em] uppercase mb-1">State</span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${
                      app.status === 'Interviewing' ? 'text-success' :
                      app.status === 'Rejected' ? 'text-danger' :
                      'text-accent'
                    }`}>
                      {app.status === 'Applied' ? 'MATRIX_INGRESS' : app.status === 'Interviewing' ? 'SYNC_ACTIVE' : 'NULL_VOID'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[9px] font-black text-text-disabled tracking-[0.3em] uppercase mb-1">Temporal</span>
                    <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest italic">{app.date}</span>
                  </div>
                  <button className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-bg-primary hover:bg-black transition-all flex items-center justify-center shadow-md active:scale-90">
                    <ArrowRight size={18} />
                  </button>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats Summary Bento Piece: Premium Light Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-secondary/30 p-8 rounded-[2rem] border border-border-primary border-dashed relative overflow-hidden">
         <div className="absolute top-0 right-1/2 bottom-0 w-px bg-gradient-to-b from-transparent via-border-primary to-transparent hidden md:block" />
         
         <div className="flex items-center gap-6 group">
            <div className="w-16 h-16 rounded-2xl bg-bg-primary shadow-xl border border-border-secondary flex items-center justify-center text-3xl font-black text-text-primary group-hover:scale-110 transition-transform">12</div>
            <div className="text-left">
               <span className="text-[10px] font-black text-text-tertiary tracking-[0.2em] uppercase block mb-1">Active_Ingress</span>
               <p className="text-xs font-bold text-text-secondary uppercase tracking-tighter leading-[1.3] italic">Applications Captured <br/>this weekly cycle</p>
            </div>
         </div>
         
         <div className="flex items-center gap-6 group">
            <div className="w-16 h-16 rounded-2xl bg-success text-bg-primary shadow-xl shadow-success/20 flex items-center justify-center text-3xl font-black group-hover:scale-110 transition-transform">4</div>
            <div className="text-left">
               <span className="text-[10px] font-black text-success tracking-[0.2em] uppercase block mb-1">Live_Synapse</span>
               <p className="text-xs font-bold text-text-secondary uppercase tracking-tighter leading-[1.3] italic">Interviews Scheduled <br/>via Neural Parser</p>
            </div>
         </div>
      </div>
    </div>
  );
};
