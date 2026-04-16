"use client";
import React, { useState } from 'react';
import { Link as LinkIcon, Globe, Linkedin, Chrome, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

export const UniversalSync = () => {
  const [url, setUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedItems, setSyncedItems] = useState([
    { id: '1', type: 'LinkedIn', title: 'Vedanshu Srivastava // Architect', status: 'Synced' },
    { id: '2', type: 'External', title: 'wugweb.com/memory-ontology', status: 'Synced' },
  ]);

  const handleSync = () => {
    if (!url.trim()) return;
    setIsSyncing(true);
    
    try {
      // Validate URL format
      new URL(url);
      
      // Simulate API call to parse URL
      setTimeout(() => {
        setIsSyncing(false);
        try {
          const host = new URL(url).hostname;
          const type = host.includes('linkedin') ? 'LinkedIn' : 'External';
          
          setSyncedItems(prev => [{
            id: Math.random().toString(),
            type,
            title: url.replace(/^https?:\/\//, '').split('/')[0] + ' // Fragment',
            status: 'Synced'
          }, ...prev]);
          
          toast.success(`${type} node bridged to Genesis stream.`);
          setUrl('');
        } catch (e) {
          toast.error("Bridge failure: Neural parsing error.");
        }
      }, 3000);
    } catch (e) {
      setIsSyncing(false);
      toast.error("Invalid URL format. Check the uplink string.");
    }
  };

  return (
    <section className="glass-panel p-8 rounded-[2rem] border border-border-secondary relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] pointer-events-none" />
      
      <div className="space-y-6 relative z-10">
        <div className="kinetic-text">
          <h3 className="text-[10px] font-black tracking-[0.4em] text-text-primary uppercase flex items-center gap-3">
             <LinkIcon size={16} className="text-accent" /> Universal_Link_Bridge
          </h3>
          <p className="text-[8px] text-text-tertiary font-bold tracking-[0.2em] mt-1 uppercase opacity-50">Pulse Importer // LinkedIn, Medium, External_URL</p>
        </div>

        <div className="flex gap-2">
           <div className="relative flex-1">
             <input 
               type="url" 
               value={url}
               onChange={(e) => setUrl(e.target.value)}
               placeholder="Paste LinkedIn profile or external resource URL..."
               className="w-full bg-bg-secondary border border-border-primary rounded-2xl px-5 py-4 text-xs font-bold text-text-primary focus:border-accent outline-none transition-colors italic shadow-inner pr-12"
             />
             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-disabled">
                {url.includes('linkedin') ? <Linkedin size={16} className="text-accent" /> : <Globe size={16} />}
             </div>
           </div>
           <button 
             onClick={handleSync}
             disabled={isSyncing || !url}
             className="px-6 rounded-2xl bg-black text-bg-primary hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center shadow-xl"
           >
             {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
           </button>
        </div>

        {/* Synced Nodes */}
        <div className="space-y-3 pt-4 border-t border-border-secondary/30">
          <span className="text-[9px] font-black text-text-disabled tracking-[0.2em] uppercase">Bridged_Nodes</span>
          <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
            <AnimatePresence initial={false}>
              {syncedItems.map(item => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary/40 border border-border-secondary group/node hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'LinkedIn' ? <Linkedin size={14} className="text-accent" /> : <LinkIcon size={14} className="text-text-tertiary" />}
                    <span className="text-[10px] font-bold text-text-secondary truncate max-w-[180px]">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <CheckCircle2 size={10} className="text-success opacity-60" />
                     <span className="text-[8px] font-black text-text-tertiary uppercase tracking-tighter opacity-0 group-hover/node:opacity-100 transition-opacity">Bridged</span>
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
