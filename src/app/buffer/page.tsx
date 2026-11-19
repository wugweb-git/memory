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

const ACTION_DONE: Record<string, string> = {
  review: 'Marked as reviewed.',
  promotable: 'Marked as promotable.',
  promote: 'Promoted to memory.',
  reject: 'Item rejected and purged.',
};

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

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
  const [actionNotice, setActionNotice] = useState<string | null>(null);
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
        setLoadError('The intake store did not respond, so items cannot be loaded. Retry in a moment.');
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
      setLoadError('The intake store did not respond, so items cannot be loaded. Retry in a moment.');
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
    setActionNotice(null);
    try {
      const res = await postBlobAction(action, id);
      if (res.ok) {
        setActionNotice(ACTION_DONE[action] ?? 'Item updated.');
        if (action === 'reject' || action === 'promote') setSelectedId(null);
        fetchItems();
        fetchStats();
      } else {
        let msg = `Could not complete "${action}" on this item (HTTP ${res.status}). Try again.`;
        try {
          const body = await res.json();
          if (body?.error || body?.message) msg = String(body.error || body.message);
        } catch { /* non-JSON */ }
        setActionError(msg);
      }
    } catch (err) {
      console.error(`Failed to ${action} blob item`, err);
      setActionError(`Network error: "${action}" did not reach the server. Check your connection and try again.`);
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
      case 'expired': return 'bg-bg-secondary text-text-tertiary';
      default: return 'bg-bg-secondary text-text-secondary';
    }
  };

  return (
    <AppShell>
      {/* Storage status strip */}
      <div className="border border-border-secondary bg-secondary rounded-2xl mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className={`w-3 h-3 rounded-full motion-safe:animate-pulse ${stats ? getStatusColor(stats.status) : 'bg-text-disabled'}`} />
            <h1 className="text-lg font-semibold text-text-primary">Buffer</h1>
            <span aria-hidden="true" className="h-4 w-px bg-border-primary mx-1" />
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              <HardDrive size={14} aria-hidden="true" />
              <span>{stats ? `${stats.usage_percent}% full` : 'Loading capacity…'}</span>
              {stats && stats.status !== 'healthy' ? <span className="font-medium text-text-secondary">({stats.status})</span> : null}
            </div>
          </div>
          
          <div className="flex min-w-0 flex-1 items-center gap-4 md:flex-none md:gap-6">
            <div
              role="progressbar"
              aria-label="Buffer capacity used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats?.usage_percent ?? 0}
              className="h-1.5 min-w-0 flex-1 md:w-48 md:flex-none bg-bg-tertiary rounded-full overflow-hidden"
            >
              <div 
                className={`h-full motion-safe:transition-all motion-safe:duration-1000 ease-out ${stats ? getStatusColor(stats.status) : 'bg-text-disabled'}`}
                style={{ width: `${stats?.usage_percent || 0}%` }}
              />
            </div>
            <button 
              aria-label="Refresh buffer"
              type="button"
              onClick={() => { fetchItems(); fetchStats(); }}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors ${focusRing}`}
            >
              <RefreshCw size={18} aria-hidden="true" className={loading ? 'motion-safe:animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Filters and capture tools */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-5 rounded-2xl bg-secondary border border-border-secondary space-y-4">
              <h2 className="text-2xs font-semibold uppercase text-text-tertiary tracking-widest">Filter by state</h2>
              <div role="group" aria-label="Filter by state" className="space-y-1">
                {(['all', 'raw', 'reviewed', 'promotable', 'promoted'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${focusRing} ${
                      activeTab === tab ? 'bg-bg-elevated border border-border-primary font-medium text-text-primary' : 'hover:bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    <span className="capitalize">{tab}</span>
                    <ChevronRight size={14} aria-hidden="true" className={activeTab === tab ? 'opacity-100' : 'opacity-0'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-secondary border border-border-secondary space-y-4">
              <h2 className="text-2xs font-semibold uppercase text-text-tertiary tracking-widest">Add to buffer</h2>
              <div role="group" aria-label="Capture method" className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
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
                    type="button"
                    aria-pressed={captureMode === mode}
                    onClick={() => setCaptureMode(mode)}
                    className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusRing} ${
                      captureMode === mode ? 'bg-text-primary text-bg-primary' : 'border border-border-secondary text-text-secondary hover:bg-bg-tertiary'
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
              <div className="flex w-full sm:w-auto items-center gap-4">
                <div className="relative w-full sm:w-auto">
                  <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input 
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="Search loaded items by ID, source or type" placeholder="Search by ID or source…"
                    className="bg-secondary border border-border-secondary rounded-full pl-10 pr-4 min-h-[44px] py-2 text-base sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full sm:w-64 lg:w-80"
                  />
                </div>
              </div>
              <div className="text-xs text-text-tertiary" role="status" aria-live="polite">
                {loading ? 'Loading items…' : <>Showing <span className="text-text-secondary font-medium">{visibleItems.length}</span> {visibleItems.length === 1 ? 'item' : 'items'}</>}
              </div>
            </div>

            <p role="status" className={actionNotice ? 'text-sm font-medium text-success' : 'sr-only'}>{actionNotice ?? ''}</p>
            <div className="rounded-2xl bg-secondary border border-border-secondary overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left border-collapse">
                <caption className="sr-only">Buffer items. Select a row's details button to review it.</caption>
                <thead>
                  <tr className="bg-secondary text-2xs uppercase tracking-widest text-text-tertiary">
                    <th scope="col" className="px-4 sm:px-6 py-4 font-medium">Item ID</th>
                    <th scope="col" className="px-4 sm:px-6 py-4 font-medium">Source</th>
                    <th scope="col" className="px-4 sm:px-6 py-4 font-medium">Type</th>
                    <th scope="col" className="px-4 sm:px-6 py-4 font-medium">Size</th>
                    <th scope="col" className="px-4 sm:px-6 py-4 font-medium">State</th>
                    <th scope="col" className="px-4 sm:px-6 py-4 font-medium">Created</th>
                    <th scope="col" className="px-4 sm:px-6 py-4 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-secondary text-sm">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} aria-hidden="true" className="motion-safe:animate-pulse">
                        <td colSpan={7} className="px-6 py-8 bg-secondary" />
                      </tr>
                    ))
                  ) : visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`px-4 sm:px-6 py-16 text-center ${loadError ? 'text-danger' : 'text-text-tertiary'}`}>
                         <div className="flex flex-col items-center gap-3">
                           <Database size={32} aria-hidden="true" />
                           <p role={loadError ? 'alert' : undefined} className={loadError ? 'font-medium' : ''}>{loadError ?? (search.trim() ? 'No loaded items match your search.' : activeTab === 'all' ? 'The buffer is empty. Add a file, voice note or link to start.' : `No ${activeTab} items.`)}</p>
                           {loadError && (
                             <button type="button" onClick={() => { fetchItems(); fetchStats(); }} className={`min-h-[44px] px-4 rounded-xl border border-danger/40 text-sm font-medium hover:bg-danger/5 ${focusRing}`}>
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
                        onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                        className={`hover:bg-bg-tertiary transition-colors cursor-pointer group ${selectedId === item.id ? 'bg-accent/10' : ''}`}
                      >
                        <td className="px-4 sm:px-6 py-4 font-mono text-2xs text-text-secondary">
                           <span title={item.id}>{item.id.substring(0, 18)}…</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="px-2 py-1 rounded bg-secondary text-xs text-text-primary">{item.source}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-text-tertiary">{item.type}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm tabular-nums text-text-tertiary">{formatSize(item.size)}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStateColor(item.state)}`}>
                            {item.state}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-xs text-text-tertiary">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <button
                            type="button"
                            aria-label={`Open details for item ${item.id.substring(0, 8)}`}
                            aria-pressed={selectedId === item.id}
                            onClick={e => { e.stopPropagation(); setSelectedId(item.id === selectedId ? null : item.id); }}
                            className={`inline-flex h-11 w-11 items-center justify-center hover:bg-bg-tertiary rounded-lg text-text-tertiary hover:text-text-primary transition-colors ${focusRing}`}>
                             <MoreVertical size={16} aria-hidden="true" />
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
              <div className="p-4 sm:p-6 rounded-2xl bg-secondary border border-border-secondary">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-text-primary font-medium">Item details</h2>
                    <p className="text-xs text-text-tertiary break-all">{selectedId}</p>
                  </div>
                  <button type="button" aria-label="Close details" onClick={() => setSelectedId(null)} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center hover:bg-bg-tertiary rounded-full transition-colors text-text-tertiary ${focusRing}`}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-4">
                    <h3 className="text-2xs font-bold uppercase tracking-widest text-text-tertiary border-b border-border-secondary pb-2">Actions</h3>
                    {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'review')}
                         className={`disabled:opacity-50 flex items-center justify-center gap-2 px-4 min-h-[44px] py-2 rounded-xl ${focusRing} bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-sm font-medium`}
                      >
                         <CheckCircle2 size={16} aria-hidden="true" /> Mark reviewed
                      </button>
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'promotable')}
                         className={`disabled:opacity-50 flex items-center justify-center gap-2 px-4 min-h-[44px] py-2 rounded-xl ${focusRing} bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-sm font-medium`}
                      >
                         <ChevronRight size={16} aria-hidden="true" /> Mark promotable
                      </button>
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'promote')}
                         className={`disabled:opacity-50 flex items-center justify-center gap-2 px-4 min-h-[44px] py-2 rounded-xl ${focusRing} bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors text-sm font-medium sm:col-span-2`}
                      >
                         <Database size={16} aria-hidden="true" /> Promote to memory
                      </button>
                      <button 
                         disabled={!!busyAction}
                         onClick={() => handleAction(selectedId, 'reject')}
                         className={`disabled:opacity-50 flex items-center justify-center gap-2 px-4 min-h-[44px] py-2 rounded-xl ${focusRing} bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors text-sm font-medium sm:col-span-2`}
                      >
                         <Trash2 size={16} aria-hidden="true" /> Reject and purge
                      </button>
                    </div>
                  </div>

                  {provenance && (
                    <div className="p-3 rounded-xl border border-border-secondary bg-bg-elevated flex flex-wrap items-center justify-between gap-2 md:col-span-2">
                      <span className="text-2xs font-semibold text-text-tertiary uppercase tracking-widest">Authenticity signal</span>
                      {(() => {
                        const p = provenance;
                        const trusted = p.reason === 'trusted';
                        return (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            trusted ? 'text-success border-success/30 bg-success/5' : 'text-warning border-warning/30 bg-warning/5'
                          }`}>
                            {trusted ? 'Likely human' : 'Possibly AI-generated'} · {typeof p.trustScore === 'number' ? `trust ${Math.round(p.trustScore * 100)}%` : 'trust unknown'}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-2xs font-bold uppercase tracking-widest text-text-tertiary border-b border-border-secondary pb-2">Payload</h3>
                    <div className="bg-bg-primary rounded-xl p-4 font-mono text-xs overflow-auto max-h-64" tabIndex={0} role="region" aria-label="Item payload">
                       <pre className="text-text-secondary">
                         {JSON.stringify(selectedItem?.raw_payload ?? null, null, 2)}
                       </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage alert strip */}
      {stats && stats.status !== 'healthy' && (
        <div role={stats.status === 'blocked' ? 'alert' : 'status'} className={`fixed bottom-16 md:bottom-0 left-0 right-0 py-3 px-4 sm:px-6 flex items-center justify-center gap-3 z-30 ${
          stats.status === 'blocked' ? 'bg-danger text-bg-primary' : 'bg-warning text-bg-primary'
        }`}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span className="text-sm font-semibold">
            {stats.status === 'blocked' ? 'Ingestion is blocked: the buffer is full.' : 'The buffer is nearly full.'}
          </span>
        </div>
      )}
    </AppShell>
  );
}
