"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Check, Database, Pin, RefreshCw, ShieldAlert, Trash2, UploadCloud } from 'lucide-react';

type BlobItem = {
  id: string;
  type: string;
  source: string;
  state: string;
  created_at: string;
  size_bytes: number;
  pinned: boolean;
  duplicate_of?: string | null;
};

type BlobStats = {
  used: string;
  limit: string;
  usage_percent: number;
  status: 'healthy' | 'warning' | 'critical';
  total_items: number;
};

const STATUS_STYLE: Record<string, string> = {
  healthy: 'text-success border-success/20 bg-success/10',
  warning: 'text-warning border-warning/20 bg-warning/10',
  critical: 'text-danger border-danger/20 bg-danger/10'
};

export function BlobBuffer() {
  const [items, setItems] = useState<BlobItem[]>([]);
  const [stats, setStats] = useState<BlobStats | null>(null);
  const [type, setType] = useState('job_description');
  const [source, setSource] = useState('manual');
  const [content, setContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const alerts = useMemo(() => {
    if (!stats) return [];
    const out: string[] = [];
    if (stats.usage_percent >= 70) out.push(`Storage usage at ${stats.usage_percent}%`);
    if (stats.status === 'critical') out.push('Writes may be blocked at critical threshold');
    return out;
  }, [stats]);

  async function refresh() {
    const [itemsRes, statsRes] = await Promise.all([
      fetch('/api/blob?limit=30'),
      fetch('/api/blob/stats')
    ]);
    const itemsJson = await itemsRes.json();
    const statsJson = await statsRes.json();
    setItems(itemsJson.items || []);
    setStats(statsJson);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function upload() {
    if (!content.trim()) return;
    setUploadProgress(0);
    for (const stage of [20, 45, 70, 90]) {
      await new Promise((r) => setTimeout(r, 160));
      setUploadProgress(stage);
    }
    await fetch('/api/blob', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, source, content })
    });
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(null), 400);
    setContent('');
    await refresh();
  }

  async function action(id: string, next: 'promote' | 'reject' | 'archive' | 'pin') {
    await fetch(`/api/blob/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: next })
    });
    await refresh();
  }

  return (
    <section className="space-y-4 max-w-6xl mx-auto w-full" aria-label="Layer 0 Blob buffer">
      <header className="glass-panel rounded-2xl p-4 border border-primary space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Database size={18} /> Buffer (Layer 0 Blob)</h2>
          <button onClick={refresh} className="px-3 py-1.5 rounded-lg border border-primary bg-secondary text-xs font-semibold focus-ring">
            <RefreshCw size={12} className="inline mr-1" />Refresh
          </button>
        </div>
        {stats && (
          <>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{stats.used} / {stats.limit}</span>
              <span>{stats.usage_percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-tertiary border border-primary overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${Math.min(100, stats.usage_percent)}%` }} />
            </div>
            <div className={`inline-flex px-2.5 py-1 rounded-lg border text-xs font-semibold ${STATUS_STYLE[stats.status]}`}>
              {stats.status.toUpperCase()} • {stats.total_items} items
            </div>
          </>
        )}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a} className="text-xs rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 flex items-center gap-2 text-warning">
                <AlertTriangle size={12} /> {a}
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="glass-panel rounded-2xl p-4 border border-primary space-y-3">
        <h3 className="text-sm font-semibold">Manual ingestion</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input value={type} onChange={(e) => setType(e.target.value)} className="bg-secondary border border-primary rounded-lg px-3 py-2 text-sm" placeholder="type" />
          <input value={source} onChange={(e) => setSource(e.target.value)} className="bg-secondary border border-primary rounded-lg px-3 py-2 text-sm" placeholder="source" />
          <button onClick={upload} className="rounded-lg bg-accent text-primary px-3 py-2 text-sm font-semibold focus-ring">
            <UploadCloud size={14} className="inline mr-1" />Store in Buffer
          </button>
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full min-h-[90px] bg-secondary border border-primary rounded-lg px-3 py-2 text-sm" placeholder="Paste external raw data..." />
        {uploadProgress !== null && (
          <div className="space-y-1">
            <div className="text-xs text-text-tertiary">uploading → processing → stored</div>
            <div className="h-2 rounded-full bg-tertiary border border-primary overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <ul role="list" className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="glass-card rounded-xl border border-primary p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold">{item.type} • {item.source}</div>
              <div className="text-xs text-text-tertiary">{item.state} • {Math.round((item.size_bytes || 0) / 1024)} KB</div>
            </div>
            <div className="text-xs text-text-tertiary mb-3">Created {new Date(item.created_at).toLocaleString()} {item.duplicate_of ? `• duplicate of ${item.duplicate_of}` : ''}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => action(item.id, 'promote')} className="px-2.5 py-1.5 rounded-lg border border-success/20 text-success text-xs font-semibold focus-ring"><Check size={12} className="inline mr-1" />Promote</button>
              <button onClick={() => action(item.id, 'archive')} className="px-2.5 py-1.5 rounded-lg border border-primary text-text-secondary text-xs font-semibold focus-ring"><Archive size={12} className="inline mr-1" />Archive</button>
              <button onClick={() => action(item.id, 'pin')} className="px-2.5 py-1.5 rounded-lg border border-accent/30 text-accent text-xs font-semibold focus-ring"><Pin size={12} className="inline mr-1" />Pin</button>
              <button onClick={() => action(item.id, 'reject')} className="px-2.5 py-1.5 rounded-lg border border-danger/20 text-danger text-xs font-semibold focus-ring"><Trash2 size={12} className="inline mr-1" />Reject</button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="glass-card rounded-xl border border-primary p-8 text-center text-sm text-text-secondary">
            <ShieldAlert size={18} className="inline mr-2" /> Buffer is empty. External noise starts here.
          </li>
        )}
      </ul>
    </section>
  );
}
