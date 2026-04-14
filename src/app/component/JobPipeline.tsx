"use client";
import React from 'react';
import { Briefcase, Mail, Chrome, Clock, AlertCircle, CheckCircle2, MoreHorizontal, ArrowRight } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });

const MOCK_APPLICATIONS = [
  { id: '1', role: 'Principle Systems Architect', company: 'Solana Labs', status: 'Applied', source: 'Indeed', via: 'Extension', date: '2h ago' },
  { id: '2', role: 'Staff UX Product Designer', company: 'Revolut', status: 'Interviewing', source: 'LinkedIn', via: 'Email Sync', date: '1d ago' },
  { id: '3', role: 'AI Engineering Lead', company: 'Anthropic', status: 'Rejected', source: 'Direct', via: 'Manual', date: '3w ago' },
];

export const JobPipeline = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-left">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Job Pipeline</h2>
          <p className="text-zinc-500 text-xs tracking-widest uppercase">Automated Application Tracking // LinkedIn, Indeed, Glassdoor</p>
        </div>
        <div className="flex gap-4">
           <div className="px-3 py-1.5 rounded-lg bg-orange-500/5 border border-orange-500/10 text-[10px] font-black text-orange-500 flex items-center gap-2">
             <Chrome size={12} /> BROWSER_SYNC: ACTIVE
           </div>
           <div className="px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[10px] font-black text-blue-500 flex items-center gap-2">
             <Mail size={12} /> EMAIL_SYNC: ACTIVE
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_APPLICATIONS.map((app) => (
          <div key={app.id} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between flex-wrap gap-4">
               <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                    app.status === 'Interviewing' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 
                    app.status === 'Rejected' ? 'bg-red-500/5 border-red-500/20 text-red-500' :
                    'bg-white/5 border-white/10 text-zinc-400'
                  }`}>
                    <Briefcase size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white mb-1">{app.role}</h4>
                    <p className="text-xs text-zinc-500 font-medium">{app.company}{' // '}<span className="text-zinc-600 italic">via {app.source}</span></p>
                  </div>
               </div>

               <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">CAPTURED_VIA</span>
                    <span className={`text-[10px] font-black tracking-widest ${jetBrains.className} text-zinc-400 uppercase`}>{app.via}</span>
                  </div>
                  <div className="flex flex-col items-end min-w-[120px]">
                    <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">PIPELINE_STATUS</span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      app.status === 'Interviewing' ? 'text-emerald-400' :
                      app.status === 'Rejected' ? 'text-red-500' :
                      'text-[#00E5FF]'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase underline decoration-white/10">LAST_UPDATE</span>
                    <span className={`text-[10px] font-black ${jetBrains.className} text-zinc-500 uppercase`}>{app.date}</span>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-600 hover:text-white transition-colors">
                    <ArrowRight size={16} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary Bento Piece */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5 border-dashed">
         <div className="flex items-center gap-4 border-r border-white/5 pr-6">
            <div className="text-3xl font-black text-white">12</div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase leading-tight text-left">Active Applications <br/>Captured this week</div>
         </div>
         <div className="flex items-center gap-4 pl-6 text-left">
            <div className="text-3xl font-black text-emerald-400">4</div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase leading-tight">Live Interviews <br/>Scheduled via Email Parser</div>
         </div>
      </div>
    </div>
  );
};
