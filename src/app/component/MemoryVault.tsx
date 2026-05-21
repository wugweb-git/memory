"use client";
import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText, Database, Trash2,
  Shield, HardDrive, LayoutGrid, List,
  Search, Plus, FileJson, FileCode, Image as ImageIcon, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VaultFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  status: 'Mapped' | 'Processing' | 'Pending';
  category: string;
};

const CATEGORIES = ['All', 'Documents', 'Images', 'Code', 'Data', 'Others'];

const FileIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'PDF': return <FileText className="text-danger" size={24} />;
    case 'JSON': return <FileJson className="text-warning" size={24} />;
    case 'HTML':
    case 'JS': return <FileCode className="text-accent" size={24} />;
    case 'PNG':
    case 'JPG':
    case 'WEBP': return <ImageIcon className="text-success" size={24} />;
    default: return <Database className="text-text-tertiary" size={24} />;
  }
};

function mapPacket(p: Record<string, unknown>): VaultFile {
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  const ext = String(meta.file_name || p.source_id || 'file').split('.').pop()?.toUpperCase() || 'FILE';
  const sizeBytes = meta.file_size as number | undefined;
  return {
    id: String(p.id),
    name: String(meta.file_name || p.source_id || 'Untitled'),
    type: ext.length <= 5 ? ext : 'FILE',
    size: sizeBytes
      ? sizeBytes < 1024 * 1024
        ? `${(sizeBytes / 1024).toFixed(1)} KB`
        : `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
      : '—',
    date: new Date(String(p.ingestion_time || Date.now())).toISOString().split('T')[0],
    status:
      p.embedding_status === 'embedded'
        ? 'Mapped'
        : p.embedding_status === 'pending'
          ? 'Pending'
          : 'Processing',
    category:
      p.type === 'document'
        ? 'Documents'
        : p.type === 'code'
          ? 'Code'
          : ['png', 'jpg', 'image'].some((x) => String(p.type).includes(x))
            ? 'Images'
            : 'Data',
  };
}

type MemoryVaultProps = {
  onRequestUpload?: () => void;
};

export const MemoryVault = ({ onRequestUpload }: MemoryVaultProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory/list?limit=50');
      if (!res.ok) throw new Error('list failed');
      const data = await res.json();
      setFiles((data.packets || []).map((p: Record<string, unknown>) => mapPacket(p)));
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('prism:memory-refresh', onRefresh);
    return () => window.removeEventListener('prism:memory-refresh', onRefresh);
  }, [load]);

  const filteredFiles = files.filter(
    (file) =>
      (activeCategory === 'All' || file.category === activeCategory) &&
      file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const removeFile = async (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    try {
      await fetch('/api/memory/packets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      load();
    }
  };

  return (
    <div className="space-y-10 w-full" aria-label="Memory vault storage cluster">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="kinetic-text">
            <h2 className="text-4xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-5">
              <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20">
                <HardDrive size={28} className="text-accent" />
              </div>
              Fragment_Browser
            </h2>
            <p className="text-[11px] text-text-tertiary font-black mt-3 uppercase tracking-[0.5em] opacity-40">
              Persistence // L1 Storage Cluster
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onRequestUpload?.();
                window.dispatchEvent(new CustomEvent('prism:open-upload'));
              }}
              className="px-8 py-3 rounded-2xl bg-text-primary text-bg-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
              <Plus size={16} /> New_Neural_Drop
            </button>
            <div className="px-6 py-3 rounded-2xl bg-bg-secondary border border-border-primary text-[10px] font-black text-success flex items-center gap-3 uppercase tracking-widest shadow-inner">
              <Shield size={16} className="opacity-60" /> {files.length} fragments
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 px-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-accent transition-colors" size={20} />
            <input
              type="text"
              placeholder="Query persistent fragments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary/30 border-2 border-border-primary/50 rounded-2xl pl-14 pr-6 py-5 text-sm font-black text-text-primary focus:border-accent/40 outline-none transition-all italic shadow-inner"
            />
          </div>
          <div className="flex gap-2 p-1.5 bg-bg-secondary rounded-2xl border border-border-primary">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-text-primary text-bg-primary shadow-lg' : 'text-text-disabled hover:text-text-primary'}`}
              aria-label="Grid view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-text-primary text-bg-primary shadow-lg' : 'text-text-disabled hover:text-text-primary'}`}
              aria-label="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                activeCategory === cat
                  ? 'bg-accent text-bg-primary border-accent shadow-lg shadow-accent/20'
                  : 'bg-bg-secondary text-text-tertiary border-border-secondary hover:border-accent/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : filteredFiles.length === 0 ? (
        <p className="text-sm text-text-tertiary italic text-center py-16 px-4">
          No memory fragments yet. Use Upload &amp; Ingest above to add documents.
        </p>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          <AnimatePresence>
            {filteredFiles.map((file, idx) => (
              <motion.article
                key={file.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="glass-panel p-6 rounded-[2rem] border border-border-secondary hover:border-accent/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <FileIcon type={file.type} />
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-2 rounded-xl text-text-disabled hover:text-danger hover:bg-danger/10 transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="text-sm font-black text-text-primary truncate">{file.name}</h3>
                <p className="text-[10px] text-text-tertiary mt-1 font-mono uppercase">
                  {file.type} · {file.size} · {file.date}
                </p>
                <span className="inline-block mt-3 text-[9px] font-black px-2 py-1 rounded-full border border-border-secondary bg-bg-secondary text-text-tertiary uppercase">
                  {file.status}
                </span>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <ul className="space-y-3 px-4" role="list">
          {filteredFiles.map((file) => (
            <li
              key={file.id}
              className="glass-panel flex items-center gap-4 p-4 rounded-2xl border border-border-secondary hover:border-border-primary transition-all"
            >
              <FileIcon type={file.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{file.name}</p>
                <p className="text-[10px] text-text-tertiary font-mono">
                  {file.category} · {file.size} · {file.date}
                </p>
              </div>
              <span className="text-[9px] font-black uppercase text-text-tertiary">{file.status}</span>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-2 text-text-disabled hover:text-danger transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
