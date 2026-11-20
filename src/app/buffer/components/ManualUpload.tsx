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
export default function ManualUpload({ onComplete, heading = 'h3' }: { onComplete: () => void; /** Heading level that fits the page outline where this is mounted. */ heading?: 'h2' | 'h3' }) {
  const Heading = heading;
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
      let body: { packetId?: string; reason?: string; error?: string; message?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON */ }
      if (xhr.status === 200) {
        setStatus('success');
        setMessage(body.packetId ? `Saved to memory (packet ${String(body.packetId).slice(0, 8)}).` : 'Saved to memory.');
        setTimeout(() => { setFile(null); setStatus('idle'); onComplete(); }, 2500);
      } else if (xhr.status === 202) {
        setStatus('stalled');
        setMessage(body.reason ? `Held by the ingestion gate: ${body.reason}` : 'Held by the ingestion gate for review.');
        onComplete();
      } else if (xhr.status === 401) {
        setStatus('error');
        setNeedsLogin(true);
        setMessage('Your session has ended. Sign in, then upload again.');
      } else {
        setStatus('error');
        setMessage(body.error || body.message || `Upload failed (HTTP ${xhr.status}). Try again, or use a smaller file.`);
      }
    };
    xhr.onerror = () => {
      setStatus('error');
      setMessage('Network error: the upload did not reach the server. Check your connection and try again.');
    };
    xhr.onabort = () => {
      setStatus('error');
      setMessage('The upload was cancelled before it finished. Try again.');
    };
    xhr.send(form);
  };

  const uploading = status === 'uploading';

  return (
    <div className="space-y-4">
      <div className="flex min-h-6 items-center justify-between">
        <Heading className={`${heading === 'h2' ? 'text-lg' : 'text-base'} font-semibold text-text-primary`}>Upload to memory</Heading>
        {uploading && <Loader2 size={14} aria-hidden="true" className="motion-safe:animate-spin text-text-tertiary" />}
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-border-primary rounded-xl min-h-40 px-4 py-6 flex flex-col items-center justify-center gap-3 hover:border-accent/50 hover:bg-accent/5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent transition-colors cursor-pointer relative group">
          <input
            type="file"
            aria-label="Choose a file to upload to memory"
            aria-describedby={status === 'error' ? 'upload-msg' : undefined}
            accept=".pdf,.txt,.md,.html,.htm,.json,.csv"
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer rounded-xl"
            onChange={handleFileChange}
          />
          <div className="w-11 h-11 rounded-full bg-secondary border border-border-secondary flex items-center justify-center text-text-tertiary motion-safe:group-hover:scale-110 motion-safe:transition-transform">
            <Upload size={20} aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-base text-text-primary font-medium">Choose a file</p>
            <p className="text-sm text-text-secondary mt-1">PDF, text, Markdown, HTML, JSON or CSV. Parsed straight into memory.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border-secondary">
            <div className="flex items-center gap-3 min-w-0">
              <Upload size={16} aria-hidden="true" className="text-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-base text-text-primary font-medium truncate">{file.name}</p>
                <p className="text-sm text-text-secondary">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            {!uploading && (
              <button type="button" aria-label="Remove selected file" onClick={() => { setFile(null); setStatus('idle'); setMessage(null); }} className="inline-flex h-11 w-11 items-center justify-center hover:bg-bg-tertiary rounded-full text-text-tertiary shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm font-medium text-text-secondary">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent motion-safe:transition-all motion-safe:duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === 'success' && (
            <p role="status" className="flex items-center gap-2 text-sm text-success font-medium">
              <Check size={16} aria-hidden="true" /> {message}
            </p>
          )}
          {status === 'stalled' && (
            <p role="status" className="flex items-center gap-2 text-sm text-warning font-medium">
              <AlertCircle size={16} aria-hidden="true" /> {message}
            </p>
          )}
          {status === 'error' && (
            <div id="upload-msg" role="alert" className="flex items-start gap-2 text-sm text-danger font-medium">
              <AlertCircle size={14} aria-hidden="true" className="shrink-0 mt-0.5" />
              <span>
                {message}{' '}
                {needsLogin && (
                  <Link href="/login?next=/buffer" className="underline font-semibold inline-flex items-center min-h-11">Sign in</Link>
                )}
              </span>
            </div>
          )}

          {(status === 'idle' || status === 'error') && !needsLogin && (
            <button
              type="button"
              onClick={startUpload}
              className="w-full min-h-12 py-2.5 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold hover:bg-text-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {status === 'error' ? 'Try the upload again' : 'Ingest into memory'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
