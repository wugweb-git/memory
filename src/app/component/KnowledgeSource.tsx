"use client";
import React, { useState } from 'react';
import { Database, Link as LinkIcon, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

export const KnowledgeSource = () => {
  const [sources, setSources] = useState([
    { id: '1', name: 'Identity_Prism_Core.pdf', type: 'document', status: 'anchored' },
    { id: '2', name: 'wugweb.com/architecture', type: 'link', status: 'anchored' },
  ]);

  const onProcessFile = (err: any, file: any) => {
    if (!err) {
      toast.success('Cognitive fragment anchored to Memory Vault.', {
        icon: <CheckCircle2 className="text-success" />
      });
      setSources(prev => [{
        id: Math.random().toString(),
        name: file.filename,
        type: 'document',
        status: 'anchored'
      }, ...prev]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-[10px] font-black tracking-[0.3em] text-text-tertiary flex items-center justify-between uppercase kinetic-text">
          Source_Intake <Database size={13} className="text-accent" aria-hidden="true" />
        </h3>
        
        <div className="relative glass-card p-4 rounded-radius-xl border-dashed border-border-primary hover:border-accent/40 transition-all duration-500">
          <FilePond
            server={{ process: '/api/upload' }}
            name="filepond"
            labelIdle='Drop PDF / Text or <span class="filepond--label-action">Browse</span>'
            onprocessfile={onProcessFile}
            className="custom-pond"
          />
        </div>
      </div>

      {/* Syncing Indicators */}
      <div className="space-y-3">
         <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Active_Anchors</span>
            <span className="text-[9px] font-bold text-accent px-2 py-0.5 bg-accent/5 rounded-full border border-accent/10">SYNC_LIVE</span>
         </div>
         <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
            <AnimatePresence initial={false}>
              {sources.map(source => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  key={source.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border-secondary hover:border-border-primary transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {source.type === 'document' ? <FileText size={14} className="text-text-tertiary" /> : <Globe size={14} className="text-text-tertiary" />}
                    <span className="text-xs font-bold text-text-secondary truncate max-w-[150px]">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-success opacity-60" />
                     <span className="text-[9px] font-black text-text-tertiary uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Anchored</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .filepond--panel-root { background-color: var(--bg-secondary) !important; border-radius: 1.5rem !important; }
        .filepond--drop-label { color: var(--text-tertiary) !important; font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; }
        .filepond--label-action { color: var(--accent) !important; text-decoration: none !important; border-bottom: 2px solid var(--accent); }
        .filepond--item-panel { background-color: var(--bg-elevated) !important; border: 1px solid var(--border-primary) !important; }
      ` }} />
    </div>
  );
};
