"use client";
import React, { useState } from 'react';
import { Database, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { FilePond } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

export const KnowledgeSource = () => {
  const [sources, setSources] = useState<{ id: string; name: string; type: string; status: string }[]>([]);

  const onProcessFile = (err: any, file: any) => {
    if (!err) {
      toast.success('File added. It is checked before it becomes memory.', {
        icon: <CheckCircle2 aria-hidden="true" className="text-success" />
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
        <h2 className="text-2xs font-bold tracking-widest text-text-tertiary flex items-center justify-between uppercase">
          Files &amp; links <Database size={13} className="text-accent" aria-hidden="true" />
        </h2>
        
        <div className="relative glass-card p-4 rounded-radius-xl border-dashed border-border-primary hover:border-accent/40 transition-all duration-500">
          <FilePond
            server={{ process: '/api/upload' }}
            name="filepond"
            labelIdle='Drop a PDF or text file, or <span class="filepond--label-action">Browse</span>'
            onprocessfile={onProcessFile}
            className="custom-pond"
          />
        </div>
      </div>

      {/* This session's uploads */}
      {sources.length > 0 && (
      <div className="space-y-3">
         <span className="text-2xs font-bold text-text-tertiary uppercase tracking-widest px-1">This session</span>
         <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
            <AnimatePresence initial={false}>
              {sources.map(source => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  key={source.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border-secondary hover:border-border-primary transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {source.type === 'document' ? <FileText aria-hidden="true" size={14} className="text-text-tertiary" /> : <Globe aria-hidden="true" size={14} className="text-text-tertiary" />}
                    <span className="text-xs font-bold text-text-secondary truncate max-w-[150px]">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-success" />
                     <span className="text-2xs font-semibold text-text-tertiary">Added</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
         </div>
      </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .filepond--panel-root { background-color: var(--bg-secondary) !important; border-radius: 1.5rem !important; }
        .filepond--drop-label { color: var(--text-tertiary) !important; font-size: var(--font-xs) !important; font-weight: 600 !important; }
        .filepond--label-action { color: var(--accent) !important; text-decoration: none !important; border-bottom: 2px solid var(--accent); }
        .filepond--item-panel { background-color: var(--bg-elevated) !important; border: 1px solid var(--border-primary) !important; }
      ` }} />
    </div>
  );
};
