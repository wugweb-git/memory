"use client";
import React from 'react';
import { Database, Upload } from 'lucide-react';
import { FilePond } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import { toast } from 'react-toastify';

export const KnowledgeSource = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-black tracking-[0.2em] text-white flex items-center justify-between">
        VECTOR_ANCHOR <Database size={14} className="text-[#00E5FF]" />
      </h3>
      <div className="relative group p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#00E5FF]/20 transition-colors">
        <FilePond
          server={{ process: '/api/upload' }}
          name="filepond"
          labelIdle={'Drop knowledge fragment...'}
          className="custom-pond"
          onprocessfile={(err) => !err && toast.success('Vector anchored.')}
        />
        <style jsx global>{`
          .filepond--panel-root { background-color: #0A0A0A !important; border: 1px dashed rgba(255,255,255,0.1); }
          .filepond--drop-label { color: #555 !important; font-size: 10px !important; letter-spacing: 0.1em; }
          .filepond--label-action { color: #00E5FF !important; }
        `}</style>
      </div>
    </div>
  );
};
