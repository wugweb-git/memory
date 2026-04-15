"use client";
import React from 'react';
import { Database } from 'lucide-react';
import { FilePond } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import { toast } from 'react-toastify';

export const KnowledgeSource = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold tracking-widest text-text-primary flex items-center justify-between uppercase">
        VECTOR_ANCHOR <Database size={13} className="text-accent" aria-hidden="true" />
      </h3>
      <div className="relative p-3 rounded-xl border border-primary bg-secondary hover:border-accent/20 transition-colors">
        <label htmlFor="knowledge-upload" className="sr-only">Upload knowledge document</label>
        <FilePond
          id="knowledge-upload"
          server={{ process: '/api/upload' }}
          name="filepond"
          labelIdle='Drop knowledge fragment or <span class="filepond--label-action">Browse</span>'
          className="custom-pond"
          onprocessfile={(err) => !err && toast.success('Vector anchored.')}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          .filepond--panel-root { background-color: var(--bg-tertiary) !important; border: 1px dashed var(--border-primary) !important; border-radius: 0.75rem !important; }
          .filepond--drop-label { color: var(--text-tertiary) !important; font-size: var(--font-xs) !important; font-family: 'Inter', sans-serif !important; }
          .filepond--label-action { color: var(--accent) !important; text-decoration: underline !important; }
          .filepond--item-panel { background-color: var(--bg-elevated) !important; }
        ` }} />
      </div>
    </div>
  );
};
