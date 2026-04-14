"use client";
import React, { useEffect, useState } from 'react';
import { 
  History, Activity, Zap, CheckCircle2, Clock, GitCommit, 
  PenTool, Layout, Layers, HeartPulse, RefreshCw, 
  Heart, Bookmark, Sparkles, Globe, MoveUpRight, AlertCircle 
} from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });

export type ActivityEntry = {
  id: string;
  type: 'creation' | 'curation';
  action: string;
  target: string;
  source: string;
  sourceUrl: string;
  time: string;
  industry: string;
  spiritNote?: string;
};

export const ActivityLog = () => {
  const [signals, setSignals] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch('/api/memory/signals');
        if (!res.ok) throw new Error("Sync failure");
        const data = await res.json();
        setSignals(data);
        setError(false);
      } catch (err) {
        console.error("Signal Fetch Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full py-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 uppercase tracking-[0.1em]">Activity Signals</h2>
          <p className="text-zinc-500 text-xs tracking-widest uppercase">Creation + Curation Stream // The Digital Vacuum</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase ${
             error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
           }`}>
              <RefreshCw size={12} className={loading ? "animate-spin" : "animate-spin-slow"} /> 
              {error ? 'VACUUM_SYNC_ERR' : 'VACUUM_STATUS: NOMINAL'}
           </div>
        </div>
      </div>

      <div className="relative border-l border-white/5 ml-4 space-y-12 py-4">
        {loading && signals.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-zinc-700">
             <RefreshCw size={32} className="animate-spin" />
             <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Neural Signals...</span>
          </div>
        ) : error && signals.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-red-500/40">
             <AlertCircle size={32} />
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Database node desynchronized.</span>
          </div>
        ) : (
          signals.map((signal) => (
            <div key={signal.id} className="relative pl-10">
              <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-[#030303] flex items-center justify-center ${
                signal.type === 'creation' 
                  ? 'bg-blue-500 shadow-[0_0_100px_rgba(59,130,246,0.3)]' 
                  : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
              }`} />
              
              <div className="glass-card p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-all group max-w-3xl bg-black/40 backdrop-blur-xl">
                 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div className="text-left">
                       <div className="flex items-center gap-2 mb-1">
                         <span className={`text-[10px] font-black tracking-[0.2em] flex items-center gap-1.5 uppercase ${
                           signal.type === 'creation' ? 'text-blue-400' : 'text-emerald-400'
                         }`}>
                           {signal.type === 'creation' ? <PenTool size={10} /> : <Bookmark size={10} />} {signal.action}
                         </span>
                         <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase truncate max-w-[100px]">via {signal.source}</span>
                       </div>
                       <h4 className="text-sm font-bold text-white group-hover:text-[#00E5FF] transition-colors flex items-center gap-2 line-clamp-1">
                          {signal.target} <MoveUpRight size={12} className="text-zinc-700 group-hover:text-[#00E5FF]" />
                       </h4>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                       <span className={`text-[9px] font-black ${jetBrains.className} text-zinc-600 uppercase`}>{signal.time}</span>
                       <span className="text-[9px] font-bold text-zinc-500 px-2 py-0.5 rounded bg-white/5 border border-white/5 mt-1 uppercase tracking-widest">{signal.industry}</span>
                    </div>
                 </div>

                 {signal.spiritNote && (
                   <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mt-2">
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium italic line-clamp-2">
                        &quot;{signal.spiritNote}&quot;
                      </p>
                   </div>
                 )}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
