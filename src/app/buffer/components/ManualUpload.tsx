'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Upload, X, Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * Direct-to-memory upload. Posts the file to /api/upload (multipart), which
 * parses PDF/HTML/text and runs the full ingestion pipeline
 * (gate → normalize → memory packet). Replaces the old @vercel/blob client
 * flow whose handler route was never implemented — uploads always failed.
 */
export default function ManualUpload({ onComplete }: { onComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'stalled' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage(null);
      setNeedsLogin(false);
    }
  };

  const startUpload = () => {
    if (!file) return;
    setStatus('uploading');
    setProgress(0);
    setMessage(null);
    setNeedsLogin(false);

    const form = new FormData();
    form.append('filepond', file);

    // XHR instead of fetch for real upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: any = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON */ }
      if (xhr.status === 200) {
        setStatus('success');
        setMessage(`In memory — packet ${String(body.packetId ?? '').slice(0, 8)}`);
        setTimeout(() => { setFile(null); setStatus('idle'); onComplete(); }, 2500);
      } else if (xhr.status === 202) {
        setStatus('stalled');
        setMessage(body.reason ? `Held by the ingestion gate: ${body.reason}` : 'Held by the ingestion gate for review.');
      } else if (xhr.status === 401) {
        setStatus('error');
        setNeedsLogin(true);
        setMessage('You need to sign in before ingesting data.');
      } else {
        setStatus('error');
        setMessage(body.error || body.message || `Upload failed (HTTP ${xhr.status})`);
      }
    };
    xhr.onerror = () => {
      setStatus('error');
      setMessage('Network error — upload did not reach the server.');
    };
    xhr.send(form);
  };

  const uploading = status === 'uploading';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xs font-bold uppercase tracking-widest text-text-tertiary">Upload to memory</h3>
        {uploading && <Loader2 size={14} className="animate-spin text-text-tertiary" />}
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-border-primary rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer relative group">
          <input
            type="file"
            accept=".pdf,.txt,.md,.html,.htm,.json,.csv"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <div className="w-11 h-11 rounded-full bg-secondary border border-border-secondary flex items-center justify-center text-text-tertiary group-hover:scale-110 transition-transform">
            <Upload size={20} />
          </div>
          <div className="text-center">
            <p className="text-sm text-text-primary font-medium">Drop a file or click to select</p>
            <p className="text-2xs text-text-tertiary mt-1">PDF, text, Markdown, HTML — parsed straight into memory</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border-secondary">
            <div className="flex items-center gap-3 min-w-0">
              <Upload size={16} className="text-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">{file.name}</p>
                <p className="text-2xs text-text-tertiary">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            {!uploading && (
              <button onClick={() => { setFile(null); setStatus('idle'); setMessage(null); }} className="p-1.5 hover:bg-bg-secondary rounded-full text-text-disabled shrink-0">
                <X size={15} />
              </button>
            )}
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-2xs font-bold text-text-tertiary">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === 'success' && (
            <p className="flex items-center gap-2 text-xs text-success font-medium">
              <Check size={14} /> {message}
            </p>
          )}
          {status === 'stalled' && (
            <p className="flex items-center gap-2 text-xs text-warning font-medium">
              <AlertCircle size={14} /> {message}
            </p>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2 text-xs text-danger font-medium">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                {message}{' '}
                {needsLogin && (
                  <Link href="/login?next=/buffer" className="underline font-bold">Sign in</Link>
                )}
              </span>
            </div>
          )}

          {status === 'idle' && (
            <button
              onClick={startUpload}
              className="w-full py-2.5 rounded-xl bg-text-primary text-bg-primary text-sm font-bold hover:bg-text-secondary transition-colors"
            >
              Ingest into memory
            </button>
          )}
        </div>
      )}
    </div>
  );
}
