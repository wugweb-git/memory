"use client";
import React, { useState } from 'react';
import { Link as LinkIcon, Globe, Linkedin, Chrome, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

export const UniversalSync = () => {
  const [url, setUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedItems, setSyncedItems] = useState([
    { id: '1', type: 'LinkedIn', title: 'Vedanshu Srivastava // Lead Architect', status: 'Bridged', lastSync: '2m ago' },
    { id: '2', type: 'External', title: 'wugweb.com/neural-papers', status: 'Bridged', lastSync: '1h ago' },
  ]);

  const handleSync = () => {
    if (!url.trim()) return;
    setIsSyncing(true);
    
    setTimeout(() => {
      setIsSyncing(false);
      try {
        const host = new URL(url).hostname;
        const type = host.includes('linkedin') ? 'LinkedIn' : 'External';
        
        setSyncedItems(prev => [{
          id: Math.random().toString(),
          type,
          title: url.replace(/^https?:\/\//, '').split('/')[0] + ' // Core Fragment',
          status: 'Bridged',
          lastSync: 'Just now'
        }, ...prev]);
        
        toast.success(`Fragment bridged to Genesis stream.`);
        setUrl('');
      } catch (e) {
        toast.error("Bridge failure: URL syntax error.");
      }
    }, 2400);
  };

  return (
    <section className="glass-panel p-10 rounded-[2.5rem] border border-border-secondary relative overflow-hidden group">
      {/* Background Pulse */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] pointer-events-none transition-all group-hover:bg-accent/10" />
      
      <div className="space-y-8 relative z-10">
        <div className="flex items-start justify-between">
          <div className="kinetic-text">
            <h3 className="text-[11px] font-black tracking-[0.5em] text-text-primary uppercase flex items-center gap-4">
               <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                 <LinkIcon size={16} className="text-accent" />
               </div>
               Neural_Uplink_Bridge
            </h3>
            <p className="text-[9px] text-text-tertiary font-black tracking-[0.3em] mt-3 uppercase opacity-40 italic">Syncing LinkedIn, Blogs, and External Intelligence</p>
          </div>
          <div className="flex -space-x-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="w-8 h-8 rounded-full border-2 border-bg-primary bg-bg-secondary flex items-center justify-center text-[8px] font-black text-text-tertiary shadow-lg overflow-hidden">
                 <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${i}`} alt="bridge" className="opacity-60" />
               </div>
             ))}
          </div>
        </div>

        <div className="flex gap-4">
           <div className="relative flex-1 group">
             <input 
               type="url" 
               value={url}
               onChange={(e) => setUrl(e.target.value)}
               placeholder="Paste resource URL (LinkedIn / Web)..."
               className="w-full bg-bg-secondary/30 border-2 border-border-primary/50 rounded-2xl px-6 py-5 text-sm font-black text-text-primary focus:border-accent/40 outline-none transition-all italic shadow-inner pr-14 tracking-tight"
             />
             <div className="absolute right-5 top-1/2 -translate-y-1/2 transition-all">
                {url.includes('linkedin') ? <Linkedin size={18} className="text-accent animate-pulse" /> : <Globe size={18} className="text-text-disabled group-focus-within:text-accent" />}
             </div>
           </div>
           <button 
             onClick={handleSync}
             disabled={isSyncing || !url}
             className="px-8 rounded-2xl bg-text-primary text-bg-primary hover:bg-accent transition-all disabled:opacity-20 flex items-center justify-center shadow-2xl relative overflow-hidden group/btn"
           >
             <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500" />
             {isSyncing ? <RefreshCw size={20} className="animate-spin relative z-10" /> : <Send size={20} className="relative z-10" />}
           </button>
        </div>

        {/* Sync Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-text-tertiary tracking-[0.3em] uppercase">Active_Bridges</span>
            <span className="text-[10px] font-black text-accent uppercase tracking-widest">{syncedItems.length} Nodes</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[180px] overflow-y-auto custom-scrollbar pr-3">
            <AnimatePresence initial={false}>
              {syncedItems.map(item => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-bg-secondary/40 border border-border-secondary group/node hover:border-accent/40 hover:bg-accent/[0.02] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-bg-primary border border-border-primary shadow-inner group-hover/node:scale-110 transition-transform">
                      {item.type === 'LinkedIn' ? <Linkedin size={16} className="text-accent" /> : <LinkIcon size={16} className="text-text-tertiary" />}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-black text-text-primary truncate max-w-[140px] block tracking-tight">{item.title}</span>
                      <span className="text-[9px] font-bold text-text-disabled uppercase tracking-widest block opacity-60">{item.lastSync}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                     <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <span className="text-[8px] font-black text-success uppercase tracking-widest">Bridged</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
