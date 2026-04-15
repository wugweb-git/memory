"use client";
import React, { useEffect, useState } from 'react';
import { RefreshCw, PenTool, Bookmark, MoveUpRight, AlertCircle } from 'lucide-react';

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
    <section className="space-y-6 max-w-4xl mx-auto w-full" aria-label="Activity signals">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Activity Signals</h2>
          <p className="text-xs text-text-tertiary font-normal mt-1 uppercase tracking-wider">Creation + Curation Stream</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase ${
          error ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-success/10 border-success/20 text-success'
        }`} role="status">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} aria-hidden="true" /> 
          <span>{error ? 'Sync Error' : 'Nominal'}</span>
        </div>
      </div>

      <ol 
        role="feed" 
        aria-label="Activity feed"
        aria-busy={loading}
        className="relative border-l border-primary ml-3 space-y-6"
      >
        {loading && signals.length === 0 ? (
          <li className="pl-8 py-16 flex flex-col items-center justify-center gap-3 text-text-tertiary" role="status">
            <RefreshCw size={28} className="animate-spin" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading signals...</span>
          </li>
        ) : error && signals.length === 0 ? (
          <li className="pl-8 py-16 flex flex-col items-center justify-center gap-3" role="alert">
            <AlertCircle size={28} className="text-danger/40" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Database node desynchronized.</span>
          </li>
        ) : (
          signals.map((signal) => (
            <li key={signal.id} className="relative pl-8">
              {/* Timeline dot */}
              <span 
                className={`absolute left-[-7px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-primary ${
                  signal.type === 'creation' ? 'bg-accent' : 'bg-success'
                }`}
                aria-hidden="true"
              />
              
              <article className="glass-card p-5 rounded-2xl border border-primary hover:border-primary/50 transition-all group">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold tracking-widest flex items-center gap-1.5 uppercase ${
                        signal.type === 'creation' ? 'text-accent' : 'text-success'
                      }`}>
                        {signal.type === 'creation' 
                          ? <PenTool size={10} aria-hidden="true" /> 
                          : <Bookmark size={10} aria-hidden="true" />
                        } {signal.action}
                      </span>
                      <span className="text-[10px] text-text-tertiary font-mono">via {signal.source}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-2">
                      {signal.target} 
                      <MoveUpRight size={12} className="text-text-disabled group-hover:text-accent transition-colors" aria-hidden="true" />
                    </h4>
                  </div>
                  <div className="flex flex-col items-start md:items-end shrink-0 gap-1">
                    <time dateTime={signal.time} className="text-[10px] font-mono text-text-tertiary">{signal.time}</time>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-primary text-text-tertiary font-mono uppercase tracking-widest">{signal.industry}</span>
                  </div>
                </div>

                {signal.spiritNote && (
                  <blockquote className="p-3 rounded-xl bg-secondary border border-primary mt-2">
                    <p className="text-xs text-text-secondary leading-relaxed italic">&ldquo;{signal.spiritNote}&rdquo;</p>
                  </blockquote>
                )}
              </article>
            </li>
          ))
        )}
      </ol>
    </section>
  );
};
