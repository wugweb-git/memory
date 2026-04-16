"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Check, Database, Pin, RefreshCw, ShieldAlert, Trash2, UploadCloud, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type BlobItem = {
  id: string;
  type: string;
  source: string;
  state: string;
  created_at: string;
  size_bytes: number;
  pinned: boolean;
  duplicate_of?: string | null;
};

type BlobStats = {
  used: string;
  limit: string;
  usage_percent: number;
  status: 'healthy' | 'warning' | 'critical';
  total_items: number;
};

const STATUS_STYLE: Record<string, string> = {
  healthy: 'text-success border-success/20 bg-success/5',
  warning: 'text-warning border-warning/20 bg-warning/5',
  critical: 'text-danger border-danger/20 bg-danger/5'
};

export function BlobBuffer() {
  const [items, setItems] = useState<BlobItem[]>([]);
  const [stats, setStats] = useState<BlobStats | null>(null);
  const [type, setType] = useState('job_description');
  const [source, setSource] = useState('manual');
  const [content, setContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const alerts = useMemo(() => {
    if (!stats) return [];
    const out: string[] = [];
    if (stats.usage_percent >= 70) out.push(`Storage usage at ${stats.usage_percent}%`);
    if (stats.status === 'critical') out.push('Writes may be blocked at critical threshold');
    return out;
  }, [stats]);

  async function refresh() {
    const [itemsRes, statsRes] = await Promise.all([
      fetch('/api/blob?limit=30'),
      fetch('/api/blob/stats')
    ]);
    const itemsJson = await itemsRes.json();
    const statsJson = await statsRes.json();
    setItems(itemsJson.items || []);
    setStats(statsJson);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, []);

  async function upload() {
    if (!content.trim()) return;
    setUploadProgress(0);
    for (const stage of [20, 45, 70, 90]) {
      await new Promise((r) => setTimeout(r, 160));
      setUploadProgress(stage);
    }
    await fetch('/api/blob', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, source, content })
    });
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(null), 400);
    setContent('');
    await refresh();
  }

  async function action(id: string, next: 'promote' | 'reject' | 'archive' | 'pin') {
    await fetch(`/api/blob/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: next })
    });
    await refresh();
  }

  return (
    <section className="space-y-10 w-full" aria-label="Layer 0 Blob buffer">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Layers size={22} className="text-accent" /> Blob_Buffer
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">LAYER_0 // UNSTRUCTURED_RESOURCE_POOL</p>
        </div>
        <button 
          onClick={refresh} 
          className="px-6 py-2.5 rounded-full bg-secondary border border-border-secondary text-[10px] font-black text-text-tertiary flex items-center gap-3 uppercase tracking-widest shadow-sm hover:bg-bg-primary transition-all active:scale-95"
        >
          <RefreshCw size={12} className="opacity-60" /> Sync_Matrix
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Stats & Ingestion */}
        <div className="lg:col-span-5 space-y-10">
          <header className="glass-panel rounded-[2.5rem] p-10 border border-border-secondary shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] pointer-events-none group-hover:opacity-100 transition-opacity" />
            
            <div className="space-y-8 relative z-10">
               <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black tracking-[0.4em] text-text-tertiary uppercase italic flex items-center gap-3">
                     <Database size={14} className="text-accent" /> Buffer_Metrics
                  </h3>
                  {stats && (
                    <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black tracking-widest uppercase shadow-inner ${STATUS_STYLE[stats.status]}`}>
                      {stats.status}
                    </div>
                  )}
               </div>

               {stats && (
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-black text-text-disabled uppercase italic">
                      <span>Density_Mapped</span>
                      <span className="text-text-primary">{stats.used} / {stats.limit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary border border-border-primary overflow-hidden p-[1px] shadow-inner">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, stats.usage_percent)}%` }} className="h-full bg-accent rounded-full shadow-[0_0_10px_rgba(0,170,255,0.3)]" />
                    </div>
                    <div className="flex justify-between items-center bg-bg-secondary/50 p-4 rounded-2xl border border-border-primary">
                       <span className="text-[10px] font-black text-text-disabled uppercase">Active_Fragments</span>
                       <span className="text-xl font-black text-text-primary italic tracking-tighter">{stats.total_items}</span>
                    </div>
                 </div>
               )}

               <AnimatePresence>
                 {alerts.length > 0 && (
                   <div className="space-y-3">
                     {alerts.map((a) => (
                       <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        key={a} 
                        className="text-[10px] font-bold rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 flex items-center gap-3 text-warning italic shadow-sm"
                       >
                         <AlertTriangle size={14} className="shrink-0" /> {a}
                       </motion.div>
                     ))}
                   </div>
                 )}
               </AnimatePresence>
            </div>
          </header>

          <div className="glass-panel rounded-[2.5rem] p-10 border border-border-secondary shadow-xl space-y-8 group">
            <h3 className="text-[10px] font-black tracking-[0.4em] text-text-tertiary uppercase flex items-center gap-3">
              <UploadCloud size={14} className="text-accent group-hover:translate-y-[-2px] transition-transform" /> Manual_Ingress
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-text-disabled uppercase ml-2">Type_Tag</label>
                <input value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-bg-secondary border border-border-primary rounded-2xl px-5 py-3 text-xs font-bold text-text-primary focus:border-accent outline-none transition-colors italic" placeholder="e.g. metadata_node" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-text-disabled uppercase ml-2">Source_Origin</label>
                <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-bg-secondary border border-border-primary rounded-2xl px-5 py-3 text-xs font-bold text-text-primary focus:border-accent outline-none transition-colors italic" placeholder="e.g. user_manual" />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-[9px] font-black text-text-disabled uppercase ml-2">Raw_Payload</label>
               <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full min-h-[160px] bg-bg-secondary border border-border-primary rounded-[1.5rem] px-5 py-4 text-xs font-medium text-text-primary focus:border-accent outline-none transition-colors italic resize-none shadow-inner" placeholder="Paste unstructured cognitive fragments..." />
            </div>

            <button 
              onClick={upload} 
              disabled={!content.trim()}
              className="w-full rounded-2xl bg-black text-bg-primary py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale disabled:scale-100"
            >
              Push_To_Buffer
            </button>

            {uploadProgress !== null && (
              <div className="space-y-3 pt-4">
                <div className="flex justify-between items-center text-[9px] font-black text-accent uppercase tracking-widest italic animate-pulse">
                   <span>Processing_Uplink...</span>
                   <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary border border-border-primary overflow-hidden p-[1px]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-accent rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: List of fragments */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2 text-[10px] font-black text-text-disabled uppercase tracking-[0.3em] italic opacity-60 mb-2">
             <span>Buffer_Queue</span>
             <span>Sorted_Recency</span>
          </div>
          <ul role="list" className="space-y-6">
            <AnimatePresence mode="popLayout">
              {items.map((item, idx) => (
                <motion.li 
                  layout
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  className="glass-panel rounded-[2rem] border border-border-secondary p-8 group hover:border-border-primary transition-all duration-500 hover:shadow-2xl relative overflow-hidden"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-6 relative z-10">
                    <div className="space-y-1">
                       <h4 className="text-sm font-black text-text-primary uppercase italic kinetic-text">{item.type}</h4>
                       <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest bg-secondary px-2 py-0.5 rounded italic">Via_{item.source}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${item.state === 'REJECTED' ? 'text-danger' : 'text-accent'}`}>{item.state}</span>
                       <span className="text-[9px] font-black font-mono text-text-disabled uppercase tracking-tighter italic opacity-60">{Math.round((item.size_bytes || 0) / 1024)} KB</span>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-text-disabled font-black font-mono uppercase tracking-widest italic opacity-40 mb-8 border-b border-border-secondary/30 pb-4">
                    Captured: {new Date(item.created_at).toLocaleString()}
                    {item.duplicate_of && <span className="text-warning ml-2 border-l-2 border-warning/20 pl-2">Conflict: Duplicate_0x{item.duplicate_of.slice(0,6)}</span>}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => action(item.id, 'promote')} className="flex-1 py-3.5 rounded-2xl bg-success/10 border border-success/20 text-success text-[9px] font-black uppercase tracking-[0.2em] hover:bg-success hover:text-bg-primary transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"><Check size={14} strokeWidth={3} /> Promote</button>
                    <button onClick={() => action(item.id, 'pin')} className="px-5 py-3.5 rounded-2xl bg-bg-secondary border border-border-primary text-text-tertiary text-[9px] font-black uppercase tracking-[0.2em] hover:bg-accent hover:text-bg-primary hover:border-accent transition-all shadow-sm active:scale-95"><Pin size={16} /></button>
                    <button onClick={() => action(item.id, 'archive')} className="px-5 py-3.5 rounded-2xl bg-bg-secondary border border-border-primary text-text-tertiary text-[9px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-bg-primary transition-all shadow-sm active:scale-95"><Archive size={16} /></button>
                    <button onClick={() => action(item.id, 'reject')} className="flex-1 py-3.5 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-[9px] font-black uppercase tracking-[0.2em] hover:bg-danger hover:text-bg-primary transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"><Trash2 size={14} strokeWidth={3} /> Reject</button>
                  </div>
                </motion.li>
              ))}
              {items.length === 0 && (
                <motion.li 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass-panel rounded-[2.5rem] border-2 border-dashed border-border-secondary p-20 text-center relative group"
                >
                  <div className="w-20 h-20 rounded-[2rem] bg-secondary border border-border-secondary flex items-center justify-center mx-auto mb-8 text-text-disabled/20 shadow-inner group-hover:scale-110 transition-transform">
                     <ShieldAlert size={40} />
                  </div>
                  <div className="space-y-4">
                     <p className="text-sm font-black text-text-tertiary uppercase tracking-[0.4em] italic mb-2">Buffer_Null_State</p>
                     <p className="text-[10px] text-text-disabled max-w-[220px] mx-auto leading-relaxed font-bold uppercase tracking-widest opacity-40">Matrix silence. External signals will manifest here for ingestion.</p>
                  </div>
                </motion.li>
              )}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </section>
  );
}
