'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppShell } from '@/app/component/AppShell';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { postBlobAction } from '@/lib/ui/blob';
import { 
  Database, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Filter, 
  HardDrive,
  X,
  RefreshCw,
  Search,
  MoreVertical
} from 'lucide-react';
import ManualUpload from './components/ManualUpload';
import { VoiceIngestion } from '@/app/component/VoiceIngestion';
import { KnowledgeSource } from '@/app/component/KnowledgeSource';
import { PulseWidget } from '@/app/component/PulseWidget';
import { UniversalSync } from '@/app/component/UniversalSync';
import { DeviceCapture } from '@/app/component/DeviceCapture';
import { CsvImport } from '@/app/component/CsvImport';

interface BlobItem {
  id: string;
  type: string;
  source: string;
  size: number;
  state: string;
  created_at: string;
  raw_payload: unknown;
  trace_json: { provenance?: { reason?: string; trustScore?: number } } | null;
}

interface BlobStats {
  used_bytes: number;
  total_bytes: number;
  usage_percent: number;
  item_count: number;
  status: 'healthy' | 'warning' | 'critical' | 'blocked';
}

export default function BufferControlSurface() {
  const [items, setItems] = useState<BlobItem[]>([]);
  const [stats, setStats] = useState<BlobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'raw' | 'reviewed' | 'promotable' | 'promoted'>('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reqId = useRef(0);
  const [captureMode, setCaptureMode] = useState<'upload' | 'voice' | 'knowledge' | 'link' | 'pulse' | 'device' | 'csv'>('upload');

  // Stats & Ingestion Monitoring
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.blob.stats.path);
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data.usage_percent === 'number') setStats(data);
    } catch (err) {
      console.error('Failed to fetch blob stats', err);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    const myReq = ++reqId.current;
    setLoading(true);
    try {
      const stateFilter = activeTab === 'all' ? '' : `&state=${activeTab}`;
      const res = await fetch(`${API_ENDPOINTS.blob.list.path}?limit=50${stateFilter}`);
      if (myReq !== reqId.current) return; // a newer request superseded this one
      if (!res.ok) {
        // A dead intake store must not look like an empty queue.
        setLoadError('Intake store unreachable — items can’t be loaded right now.');
        setItems([]);
        return;
      }
      const data = await res.json();
      if (myReq !== reqId.current) return;
      setLoadError(null);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      if (myReq !== reqId.current) return;
      console.error('Failed to fetch blob items', err);
      setLoadError('Intake store unreachable — items can’t be loaded right now.');
      setItems([]);
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setSelectedId(null);
    fetchStats();
    fetchItems();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchItems]);

  const handleAction = async (id: string, action: string) => {
    if (busyAction) return;
    if (action === 'reject' && !window.confirm('Reject and purge this item? This cannot be undone.')) return;
    setBusyAction(action);
    setActionError(null);
    try {
      const res = await postBlobAction(action, id);
      if (res.ok) {
        if (action === 'reject' || action === 'promote') setSelectedId(null);
        fetchItems();
        fetchStats();
      } else {
        let msg = `Could not ${action} this item (HTTP ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error || body?.message) msg = String(body.error || body.message);
        } catch { /* non-JSON */ }
        setActionError(msg);
      }
    } catch (err) {
      console.error(`Failed to ${action} blob item`, err);
      setActionError(`Network error — could not ${action} this item.`);
    } finally {
      setBusyAction(null);
    }
  };

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.id.toLowerCase().includes(q) || (i.source || '').toLowerCase().includes(q) || (i.type || '').toLowerCase().includes(q));
  }, [items, search]);
  const selectedItem = useMemo(() => items.find(i => i.id === selectedId) ?? null, [items, selectedId]);
  const provenance = selectedItem?.trace_json?.provenance;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'critical': return 'bg-danger';
      case 'blocked': return 'bg-danger';
      default: return 'bg-text-disabled';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'raw': return 'bg-bg-secondary text-text-secondary';
      case 'reviewed': return 'bg-accent/10 text-accent';
      case 'promotable': return 'bg-accent/10 text-accent';
      case 'promoted': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-danger/10 text-danger';
      case 'expired': return 'bg-bg-secondary text-text-disabled';
      default: return 'bg-bg-secondary text-text-secondary';
    }
  };

  return (
    <AppShell>
      {/* Storage status strip */}
      <div className="border border-border-secondary bg-secondary rounded-radius-xl mb-6">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full animate-pulse ${stats ? getStatusColor(stats.status) : 'bg-text-disabled'}`} />
            <h1 className="text-sm font-bold tracking-tight text-text-primary">Buffer</h1>
            <span className="h-4 w-px bg-secondary mx-2" />
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <HardDrive size={14} />
              <span>{stats ? `${stats.usage_percent}% capacity` : 'Loading…'}</span>
            </div>
          </div>
          
          <div className="flex w-full min-w-0 items-center gap-4 md:w-auto md:gap-6">
            <div className="h-1.5 min-w-0 flex-1 md:w-48 md:flex-none bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${stats ? getStatusColor(stats.status) : 'bg-text-disabled'}`}
                style={{ width: `${stats?.usage_percent || 0}%` }}
              />
            </div>
            <button 
              aria-label="Refresh buffer"
              onClick={() => { fetchItems(); fetchStats(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-secondary text-text-tertiary hover:text-text-primary transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Filters and capture tools */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-5 rounded-2xl bg-secondary border border-border-secondary space-y-4">
              <h2 className="text-2xs font-semibold uppercase text-text-disabled tracking-widest">Filter items</h2>
              <div className="space-y-1">
                {(['all', 'raw', 'reviewed', 'promotable', 'promoted'] as const).map(tab => (
                  <button
                    key={tab}
                    aria-pressed={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      activeTab === tab ? 'bg-secondary text-text-primary' : 'hover:bg-secondary text-text-tertiary'
                    }`}
                  >
                    <span className="capitalize">{tab}</span>
                    <ChevronRight size={14} className={activeTab === tab ? 'opacity-100' : 'opacity-0'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-secondary border border-border-secondary space-y-4">
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
                {([
                  ['upload', 'Upload'],
                  ['voice', 'Voice'],
                  ['knowledge', 'Files'],
                  ['link', 'Link'],
                  ['pulse', 'Pulse'],
                  ['device', 'Device'],
                  ['csv', 'Import'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    aria-pressed={captureMode === mode}
                    onClick={() => setCaptureMode(mode)}
                    className={`px-2 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                      captureMode === mode ? 'bg-text-primary text-bg-primary' : 'text-text-tertiary hover:bg-bg-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {captureMode === 'upload' && <ManualUpload onComplete={() => fetchItems()} />}
              {captureMode === 'voice' && <VoiceIngestion />}
              {captureMode === 'knowledge' && <KnowledgeSource />}
              {captureMode === 'link' && <UniversalSync />}
              {captureMode === 'pulse' && <PulseWidget />}
              {captureMode === 'device' && <DeviceCapture />}
              {captureMode === 'csv' && <CsvImport onComplete={() => fetchItems()} />}
            </div>
          </div>

          {/* Blob feed */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input 
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="Search loaded items by ID, source or type" placeholder="Search by ID or source…"
                    className="bg-secondary border border-border-secondary rounded-full pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 w-full sm:w-64 lg:w-80 transition-all"
                  />
                </div>
              </div>
              <div className="text-xs text-text-disabled">
                Showing <span className="text-text-secondary font-medium">{visibleItems.length}</span> {visibleItems.length === 1 ? 'item' : 'items'}
              </div>
            </div>

            <div className="rounded-2xl bg-secondary border border-border-secondary overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary text-2xs uppercase tracking-widest text-text-tertiary">
                    <th className="px-6 py-4 font-medium">Item ID</th>
                    <th className="px-6 py-4 font-medium">Source</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Size</th>
                    <th className="px-6 py-4 font-medium">State</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-secondary text-sm">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-8 bg-secondary" />
                      </tr>
                    ))
                  ) : visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`px-6 py-20 text-center ${loadError ? 'text-danger' : 'text-text-disabled'}`}>
                         <div className="flex flex-col items-center gap-3">
                           <Database size={32} />
                           <p className={loadError ? 'font-bold' : ''}>{loadError ?? (search.trim() ? 'No loaded items match your search.' : 'Nothing waiting for review.')}</p>
                           {loadError && (
                             <button onClick={() => { fetchItems(); fetchStats(); }} className="px-4 py-1.5 rounded-xl border border-danger/40 text-xs font-bold hover:bg-danger/5">
                               Retry
                             </button>
                           )}
                         </div>
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map(item => (
                      <tr 
                        key={item.id} 
                        tabIndex={0}
                        aria-selected={selectedId === item.id}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(item.id === selectedId ? null : item.id); } }}
                        onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                        className={`hover:bg-secondary transition-colors cursor-pointer group ${selectedId === item.id ? 'bg-accent/10' : ''}`}
                      >
                        <td className="px-6 py-4 font-mono text-2xs text-text-secondary">
                           <span title={item.id}>{item.id.substring(0, 18)}…</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded bg-secondary text-2xs text-text-primary">{item.source}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-text-tertiary">{item.type}</td>
                        <td className="px-6 py-4 text-xs tabular-nums text-text-tertiary">{formatSize(item.size)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${getStateColor(item.state)}`}>
                            {item.state}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-2xs text-text-disabled">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            aria-label="Open item details"
                            onClick={e => { e.stopPropagation(); setSelectedId(item.id); }}
                            className="p-1 hover:bg-secondary rounded text-text-disabled hover:text-text-primary transition-all">
                             <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Item viewer */}
            {selectedId && selectedItem && (
              <div className="p-6 rounded-2xl bg-secondary border border-border-secondary animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-text-primary font-medium">Item details</h3>
                    <p className="text-xs text-text-disabled">{selectedId}</p>
                  </div>
                  <button aria-label="Close details" onClick={() => setSelectedId(null)} className="p-1 hover:bg-secondary rounded-full transition-colors text-text-tertiary">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-2xs font-bold uppercase tracking-widest text-text-tertiary border-b border-border-secondary pb-2">Actions</h4>
                    {actionError && <p role="alert" className="text-xs text-danger">{actionError}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'review')}
                         className="disabled:opacity-50 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all text-sm font-medium"
                      >
                         <CheckCircle2 size={16} /> Mark reviewed
                      </button>
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'promotable')}
                         className="disabled:opacity-50 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all text-sm font-medium"
                      >
                         <ChevronRight size={16} /> Mark promotable
                      </button>
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'promote')}
                         className="disabled:opacity-50 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-all text-sm font-medium col-span-2"
                      >
                         < RefreshCw size={16} /> Promote to memory
                      </button>
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'reject')}
                         className="disabled:opacity-50 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-all text-sm font-medium col-span-2"
                      >
                         <Trash2 size={16} /> Reject and purge
                      </button>
                    </div>
                  </div>

                  {provenance && (
                    <div className="p-3 rounded-xl border border-border-secondary bg-secondary/40 flex items-center justify-between">
                      <span className="text-2xs font-bold text-text-tertiary uppercase tracking-widest">Authenticity signal</span>
                      {(() => {
                        const p = provenance;
                        const trusted = p.reason === 'trusted';
                        return (
                          <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${
                            trusted ? 'text-success border-success/30 bg-success/5' : 'text-warning border-warning/30 bg-warning/5'
                          }`}>
                            {trusted ? 'Likely human' : 'Possibly AI-generated'} · {typeof p.trustScore === 'number' ? `trust ${Math.round(p.trustScore * 100)}%` : 'trust unknown'}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-2xs font-bold uppercase tracking-widest text-text-tertiary border-b border-border-secondary pb-2">Payload</h4>
                    <div className="bg-bg-primary rounded-xl p-4 font-mono text-2xs overflow-auto max-h-64 ">
                       <pre className="text-success/80">
                         {JSON.stringify(selectedItem?.raw_payload ?? null, null, 2)}
                       </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Storage alert strip */}
      {stats && stats.status !== 'healthy' && (
        <div className={`fixed bottom-16 md:bottom-0 left-0 right-0 py-3 px-6 flex items-center justify-center gap-3 z-30 ${
          stats.status === 'blocked' ? 'bg-danger text-bg-primary' : 'bg-warning text-bg-primary'
        }`}>
          <AlertTriangle size={18} />
          <span className="text-sm font-bold">
            {stats.status === 'blocked' ? 'Ingestion is blocked: the buffer is full.' : 'The buffer is nearly full.'}
          </span>
        </div>
      )}
    </AppShell>
  );
}
