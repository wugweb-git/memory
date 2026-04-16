'use client';

import React, { useState } from 'react';
import { Upload, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { upload } from '@vercel/blob/client';

export default function ManualUpload({ onComplete }: { onComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setError(null);
    }
  };

  const startUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('uploading');
    setProgress(0);

    try {
      // 1. REAL UPLOAD TO VERCEL BLOB
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload-handler', // Needs to be implemented
        onUploadProgress: (progressEvent) => {
          setProgress(progressEvent.percentage);
        },
      });

      setStatus('processing');

      // 2. STORE METADATA IN SUPABASE (via Layer 0 API)
      const res = await fetch('/api/blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual_upload',
          source: 'user_buffer',
          source_id: 'manual',
          raw_payload: {
            filename: file.name,
            size: file.size,
            type: file.type
          },
          file_ref: newBlob.url,
          trace_json: {
            origin: 'web_ui',
            ingestion_path: 'buffer/manual_upload',
            blob_url: newBlob.url
          }
        })
      });

      if (!res.ok) throw new Error('Failed to register upload in buffer database');

      setStatus('success');
      setTimeout(() => {
        setFile(null);
        setStatus('idle');
        onComplete();
      }, 2000);

    } catch (err: any) {
      console.error('Upload failure', err);
      setError(err.message || 'Upload failed');
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Manual Data Ingest</h3>
        <button className="text-white/20 hover:text-white transition-colors">
          <Loader2 className={`w-4 h-4 ${uploading ? 'animate-spin' : 'hidden'}`} />
        </button>
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center justify-center gap-4 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer relative group">
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm text-white/80">Drop file or click to select</p>
            <p className="text-xs text-white/30 mt-1">Maximum payload: 50MB</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-indigo-400">
                <Upload size={20} />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{file.name}</p>
                <p className="text-[10px] text-white/30 uppercase">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            {status !== 'uploading' && (
              <button onClick={() => setFile(null)} className="p-2 hover:bg-white/10 rounded-full text-white/40">
                <X size={16} />
              </button>
            )}
          </div>

          {status === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex items-center gap-2 text-xs text-amber-400 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Finalizing node persistence...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Check className="w-4 h-4" />
              <span>Ingestion successful. Node at quarantine.</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-xs text-rose-500">
              <AlertCircle className="w-4 h-4" />
              <span>{error || 'Ingestion failed'}</span>
            </div>
          )}

          {status === 'idle' && (
            <button 
              onClick={startUpload}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
            >
              Start Secure Ingest
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
