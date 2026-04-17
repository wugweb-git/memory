"use client";
import React, { useEffect, useState } from 'react';
import { RefreshCw, PenTool, Bookmark, MoveUpRight, AlertCircle, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        const res = await fetch('/api/memory/signals', { cache: 'no-store' });
        if (!res.ok) throw new Error("Sync failure");
        const data = await res.json();
        setSignals(data);
        setError(false);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="space-y-8 max-w-4xl mx-auto w-full" aria-label="Activity signals">
      <div className="flex items-center justify-between px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Signal size={22} className="text-accent" /> Activity_Pulse
          </h2>
          <p className="text-xs text-text-tertiary font-bold mt-1 tracking-[0.2em] uppercase opacity-60">Creation + Curation Stream</p>
        </div>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-full border text-[10px] font-black tracking-widest uppercase transition-all duration-700 ${
          error ? 'bg-danger/10 border-danger/20 text-danger shadow-lg shadow-danger/10' : 'bg-success/5 border-success/20 text-success'
        }`} role="status">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} aria-hidden="true" /> 
          <span>{error ? 'Link_Offline' : 'Matrix_Nominal'}</span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-[20px] top-4 bottom-4 w-px bg-gradient-to-b from-border-primary via-border-secondary to-transparent" />
        
        <ol 
          role="feed" 
          aria-label="Activity feed"
          aria-busy={loading}
          className="space-y-10"
        >
          <AnimatePresence mode="popLayout">
            {loading && signals.length === 0 ? (
              <motion.li 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="pl-14 py-20 flex flex-col items-center justify-center gap-4 text-text-tertiary" 
                role="status"
              >
                <RefreshCw size={32} className="animate-spin text-accent" aria-hidden="true" />
                <span className="text-[10px] font-black tracking-widest uppercase">Synchronizing Matrix...</span>
              </motion.li>
            ) : error && signals.length === 0 ? (
              <motion.li 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="pl-14 py-20 flex flex-col items-center justify-center gap-4" 
                role="alert"
              >
                <AlertCircle size={32} className="text-danger/40" aria-hidden="true" />
                <span className="text-[10px] font-black tracking-widest text-text-tertiary uppercase">Database node desynchronized.</span>
              </motion.li>
            ) : (
              signals.map((signal, idx) => (
                <motion.li 
                  key={signal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative pl-14"
                >
                  {/* Timeline dot */}
                  <span 
                    className={`absolute left-[13px] top-2 w-3.5 h-3.5 rounded-full border-2 border-bg-primary shadow-xl z-10 ${
                      signal.type === 'creation' ? 'bg-accent' : 'bg-success'
                    }`}
                    aria-hidden="true"
                  />
                  
                  <article className="glass-panel p-6 rounded-radius-xl border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                    {/* Perspective gradient */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black tracking-[0.2em] px-2 py-0.5 rounded-full border uppercase flex items-center gap-1.5 ${
                            signal.type === 'creation' 
                              ? 'bg-accent/5 border-accent/20 text-accent' 
                              : 'bg-success/5 border-success/20 text-success'
                          }`}>
                            {signal.type === 'creation' 
                              ? <PenTool size={10} aria-hidden="true" /> 
                              : <Bookmark size={10} aria-hidden="true" />
                            } {signal.action}
                          </span>
                          <span className="text-[10px] text-text-disabled font-mono font-bold uppercase tracking-widest">Via_{signal.source}</span>
                        </div>
                        <h4 className="text-lg font-black text-text-primary tracking-tighter group-hover:text-accent transition-colors flex items-center gap-3 group/title">
                          {signal.target} 
                          <MoveUpRight size={14} className="text-text-disabled group-hover/title:translate-x-1 group-hover/title:-translate-y-1 transition-transform" aria-hidden="true" />
                        </h4>
                      </div>
                      <div className="flex flex-col items-start md:items-end shrink-0 gap-2">
                        <time dateTime={signal.time} className="text-[10px] font-black font-mono text-text-tertiary tracking-widest">{signal.time}</time>
                        <span className="text-[9px] px-3 py-1 rounded-full bg-secondary border border-border-secondary text-text-tertiary font-black tracking-widest uppercase italic">{signal.industry}</span>
                      </div>
                    </div>

                    {signal.spiritNote && (
                      <blockquote className="p-4 rounded-radius-xl bg-bg-secondary/40 border-l-2 border-accent mt-2 shadow-inner">
                        <p className="text-xs text-text-secondary leading-relaxed italic font-medium">&ldquo;{signal.spiritNote}&rdquo;</p>
                      </blockquote>
                    )}
                  </article>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ol>
      </div>
    </section>
  );
};
