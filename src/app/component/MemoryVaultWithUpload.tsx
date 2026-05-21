"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Database, HardDrive, Trash2,
  LayoutGrid, List, Search, Plus, Shield,
  RefreshCcw, CheckCircle2, AlertCircle, X, Loader2,
  FileJson, FileCode, Image as ImageIcon
} from 'lucide-react';

/* ── types ──────────────────────────────────────────────────── */
type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

interface MemoryItem {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  status: 'Mapped' | 'Processing' | 'Pending';
  category: string;
}

interface MemoryStats {
  total_packets: number;
  mapped: number;
  used_gb: number;
  limit_gb: number;
}

const CATEGORIES = ['All', 'Documents', 'Images', 'Code', 'Data'];

/* ── helpers ─────────────────────────────────────────────────── */
const FileIcon = ({ type }: { type: string }) => {
  if (type === 'PDF')  return <FileText size={20} className="shrink-0 text-red-400" />;
  if (type === 'JSON') return <FileJson size={20} className="shrink-0 text-yellow-500" />;
  if (type === 'HTML' || type === 'JS') return <FileCode size={20} className="shrink-0 text-blue-400" />;
  if (['PNG','JPG','WEBP'].includes(type)) return <ImageIcon size={20} className="shrink-0 text-emerald-400" />;
  return <Database size={20} className="shrink-0 text-text-disabled" />;
};

const StatusBadge = ({ status }: { status: MemoryItem['status'] }) => {
  const map: Record<MemoryItem['status'], string> = {
    Mapped:     'bg-success/10 text-success border-success/20',
    Processing: 'bg-warning/10 text-warning border-warning/20',
    Pending:    'bg-secondary text-text-tertiary border-border-secondary',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status]}`}>
      {status === 'Processing' && <Loader2 size={9} className="animate-spin" />}
      {status}
    </span>
  );
};

/* ── drop zone ───────────────────────────────────────────────── */
const DropZone: React.FC<{ onUploaded: (item: MemoryItem) => void }> = ({ onUploaded }) => {
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(async (file: File) => {
    setState('uploading');
    setProgress(10);
    const form = new FormData();
    form.append('filepond', file); // matches the field name the API expects

    const tick = setInterval(() => setProgress(p => Math.min(p + 12, 85)), 300);
    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      clearInterval(tick);
      setProgress(100);

      const data = await res.json();

      // 200 = ACCEPTED and saved. Any other code (202 = gate stall, 4xx, 5xx) is a failure.
      if (res.status !== 200 || !data.packetId) {
        throw new Error(data.message || data.reason || 'Upload rejected by ingestion gate');
      }

      setMessage('Anchored to memory');
      setState('success');
      onUploaded({
        id:       data.packetId,
        name:     file.name,
        type:     file.name.split('.').pop()?.toUpperCase() || 'FILE',
        size:     file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        date:     new Date().toISOString().split('T')[0],
        status:   'Pending',
        category: 'Documents',
      });
      setTimeout(() => { setState('idle'); setProgress(0); }, 3000);
    } catch (e: any) {
      clearInterval(tick);
      setMessage(e.message || 'Upload failed');
      setState('error');
      setTimeout(() => { setState('idle'); setProgress(0); }, 4000);
    }
  }, [onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  }, [doUpload]);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  }, [doUpload]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (state === 'idle') setState('dragging'); }}
      onDragLeave={() => state === 'dragging' && setState('idle')}
      onDrop={onDrop}
      onClick={() => state === 'idle' && inputRef.current?.click()}
      className={`relative glass-panel rounded-[2rem] border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden select-none ${
        state === 'dragging' ? 'border-accent bg-accent/5 scale-[1.01]'
        : state === 'success' ? 'border-success/50 bg-success/5 cursor-default'
        : state === 'error'   ? 'border-danger/50 bg-danger/5 cursor-default'
        : state === 'uploading' ? 'border-accent/40 cursor-wait'
        : 'border-border-secondary hover:border-accent/40 hover:bg-accent/[0.02]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx,.html,.json,.md"
        onChange={onFile}
        className="sr-only"
      />

      <div className="p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[160px]">
        <AnimatePresence mode="wait">
          {(state === 'idle' || state === 'dragging') && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-colors duration-300 ${
                state === 'dragging' ? 'bg-accent/10 border-accent text-accent' : 'bg-secondary border-border-primary text-text-tertiary'
              }`}>
                <Upload size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {state === 'dragging' ? 'Drop to anchor' : 'Drop file or click to upload'}
                </p>
                <p className="text-[11px] text-text-tertiary mt-1">PDF, TXT, DOC, HTML, JSON, MD</p>
              </div>
            </motion.div>
          )}

          {state === 'uploading' && (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-4 px-4">
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="text-accent animate-spin shrink-0" />
                <span className="text-sm font-semibold text-text-primary">Processing…</span>
                <span className="ml-auto text-[11px] font-mono text-text-tertiary">{progress}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
                  className="h-full bg-accent rounded-full" />
              </div>
              <p className="text-[11px] text-text-tertiary">Parse → Gate → Normalise → Embed…</p>
            </motion.div>
          )}

          {state === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center border-2 border-success/30">
                <CheckCircle2 size={22} className="text-success" />
              </div>
              <p className="text-sm font-semibold text-success">{message}</p>
              <p className="text-[11px] text-text-tertiary">Embedding will complete in background</p>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center border-2 border-danger/30">
                <AlertCircle size={22} className="text-danger" />
              </div>
              <p className="text-sm font-semibold text-danger">Upload failed</p>
              <p className="text-[11px] text-text-tertiary max-w-[260px]">{message}</p>
              <button onClick={(e) => { e.stopPropagation(); setState('idle'); }}
                className="text-[10px] font-bold text-accent hover:underline mt-1">Try again →</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── main component ──────────────────────────────────────────── */
export const MemoryVaultWithUpload: React.FC = () => {
  const [items, setItems]           = useState<MemoryItem[]>([]);
  const [stats, setStats]           = useState<MemoryStats | null>(null);
  const [view, setView]             = useState<'grid' | 'list'>('list');
  const [cat, setCat]               = useState('All');
  const [query, setQuery]           = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading]       = useState(true);

  /* Load real memory packets from the API */
  useEffect(() => {
    const openUpload = () => setShowUpload(true);
    window.addEventListener('prism:open-upload', openUpload);
    return () => window.removeEventListener('prism:open-upload', openUpload);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [packetsRes, statsRes] = await Promise.all([
          fetch('/api/memory/list'),
          fetch('/api/memory/stats'),
        ]);

        if (packetsRes.ok) {
          const packetData = await packetsRes.json();
          const apiItems: MemoryItem[] = (packetData.packets || []).map((p: any) => ({
            id:       p.id,
            name:     p.metadata?.file_name || p.source_id || 'Untitled',
            type:     (p.metadata?.file_type || 'TXT').split('/').pop()?.toUpperCase() || 'FILE',
            size:     p.metadata?.file_size
                        ? p.metadata.file_size < 1024 * 1024
                          ? `${(p.metadata.file_size / 1024).toFixed(1)} KB`
                          : `${(p.metadata.file_size / 1024 / 1024).toFixed(1)} MB`
                        : '—',
            date:     new Date(p.ingestion_time || p.created_at).toISOString().split('T')[0],
            status:   p.embedding_status === 'complete' ? 'Mapped'
                        : p.embedding_status === 'pending' ? 'Pending'
                        : 'Processing',
            category: p.type === 'document' ? 'Documents'
                        : p.type === 'code' ? 'Code'
                        : 'Data',
          }));
          setItems(apiItems);
        }

        if (statsRes.ok) {
          const s = await statsRes.json();
          const embedded = s.embedding_stats?.embedded ?? s.embedded ?? 0;
          setStats({
            total_packets: s.total_packets ?? s.total ?? 0,
            mapped: embedded,
            used_gb: +(s.storage_gb ?? 0).toFixed(1),
            limit_gb: 10,
          });
        }
      } catch {
        // Silently fail — component still functional, just shows empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = items.filter(f =>
    (cat === 'All' || f.category === cat) &&
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const onUploaded = (item: MemoryItem) => {
    setItems(prev => [item, ...prev]);
    setShowUpload(false);
    if (stats) setStats(s => s ? { ...s, total_packets: s.total_packets + 1 } : s);
    window.dispatchEvent(new CustomEvent('prism:memory-refresh'));
  };

  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/memory/packets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch { /* Optimistic delete — ignore errors */ }
  };

  const storePct = stats ? Math.min(100, Math.round((stats.used_gb / stats.limit_gb) * 100)) : 34;

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search memory packets…"
            className="w-full bg-secondary/50 border border-border-primary rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUpload(v => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-sm ${
              showUpload ? 'bg-secondary border border-border-primary text-text-primary' : 'bg-text-primary text-bg-primary hover:bg-black'
            }`}
          >
            {showUpload ? <X size={16} /> : <Plus size={16} />}
            {showUpload ? 'Cancel' : 'Upload to Memory'}
          </button>

          <div className="flex items-center bg-secondary/40 border border-border-primary p-1 rounded-xl">
            {(['list', 'grid'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`p-2 rounded-lg transition-all ${view === v ? 'bg-bg-elevated text-accent shadow-inner' : 'text-text-disabled hover:text-text-tertiary'}`}>
                {v === 'list' ? <List size={16} /> : <LayoutGrid size={16} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* upload panel */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <DropZone onUploaded={onUploaded} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-4 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all border ${
              cat === c ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-primary text-text-tertiary hover:bg-bg-elevated hover:text-text-primary'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* loading skeleton */}
      {loading && (
        <div className="glass-panel rounded-[2rem] border border-border-secondary p-12 flex items-center justify-center gap-3 text-text-disabled shadow-2xl">
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-sm font-medium">Loading memory packets…</span>
        </div>
      )}

      {/* items */}
      {!loading && (
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-panel rounded-[2rem] border border-border-secondary overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border-primary">
                      {['File', 'Type', 'Size', 'Date', 'Status', ''].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-secondary/30">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-text-disabled">
                            <Database size={32} strokeWidth={1} />
                            <p className="text-sm font-medium">No packets found</p>
                            <button onClick={() => setShowUpload(true)} className="text-accent text-[12px] font-semibold hover:underline">
                              Upload your first document →
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((f, idx) => (
                        <motion.tr key={f.id}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                          className="group hover:bg-accent/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-secondary border border-border-primary flex items-center justify-center shrink-0">
                                <FileIcon type={f.type} />
                              </div>
                              <span className="text-sm font-semibold text-text-primary truncate max-w-[200px] group-hover:text-accent transition-colors">{f.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-mono text-text-tertiary uppercase">{f.type}</td>
                          <td className="px-6 py-4 text-[11px] text-text-tertiary">{f.size}</td>
                          <td className="px-6 py-4 text-[11px] font-mono text-text-tertiary">{f.date}</td>
                          <td className="px-6 py-4"><StatusBadge status={f.status} /></td>
                          <td className="px-6 py-4">
                            <button onClick={() => removeItem(f.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-danger/10 text-text-disabled hover:text-danger">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-full glass-panel rounded-[2rem] border border-border-secondary p-12 flex flex-col items-center gap-4 text-text-disabled shadow-2xl">
                  <Database size={32} strokeWidth={1} />
                  <p className="text-sm font-medium">No packets found</p>
                  <button onClick={() => setShowUpload(true)} className="text-accent text-[12px] font-semibold hover:underline">Upload your first document →</button>
                </div>
              ) : (
                filtered.map((f, idx) => (
                  <motion.div key={f.id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className="glass-panel p-6 rounded-[2rem] border border-border-secondary hover:border-accent/30 transition-all group shadow-2xl">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary border border-border-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileIcon type={f.type} />
                      </div>
                      <button onClick={() => removeItem(f.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-danger/10 text-text-disabled hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-text-primary leading-tight line-clamp-2 mb-2 group-hover:text-accent transition-colors">{f.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-text-tertiary font-mono mb-3">
                      <span>{f.type}</span><span>·</span><span>{f.size}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border-secondary/50">
                      <StatusBadge status={f.status} />
                      <span className="text-[10px] font-mono text-text-disabled">{f.date}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* storage stats — driven by real API data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-[2rem] border border-border-secondary shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <HardDrive size={16} className="text-accent" />
            <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">Storage Usage</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border-primary">
            <motion.div initial={{ width: 0 }} animate={{ width: `${storePct}%` }} className="h-full bg-accent opacity-80 rounded-full" />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-text-tertiary">
            <span>{stats ? `${stats.used_gb} GB used` : '—'}</span>
            <span>{stats ? `${stats.limit_gb} GB limit` : '—'}</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-[2rem] border border-border-secondary shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-success" />
            <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">Encryption</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-tertiary">Protocol</span>
              <span className="font-mono text-success font-semibold">AES-GCM-256</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-text-tertiary">Redundancy</span>
              <span className="font-mono text-success font-semibold">3× cloud sync</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-[2rem] border border-border-secondary shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <Database size={16} className="text-text-tertiary" />
            <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">Index Stats</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-tertiary">Total packets</span>
              <span className="font-semibold text-text-primary">{stats ? stats.total_packets.toLocaleString() : items.length}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-text-tertiary">Mapped</span>
              <span className="font-semibold text-success">{stats ? stats.mapped.toLocaleString() : items.filter(i => i.status === 'Mapped').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
