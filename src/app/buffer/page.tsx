'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppShell } from '@/app/component/AppShell';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { postBlobAction } from '@/lib/ui/blob';
import { AppToastContainer } from '@/app/component/AppToastContainer';
import { toast } from 'react-toastify';
import { describePromoteOutcome } from './promote-outcome';
import { Card, EmptyState, Skeleton, PageHeader } from '@/components/ui/primitives';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  HardDrive,
  Inbox,
  X,
  RefreshCw,
  Search,
  MoreVertical,
  Plus,
} from 'lucide-react';
import ManualUpload from './components/ManualUpload';
import { BufferDeviceTools } from './components/DeviceTools';
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

type Tab = 'all' | 'raw' | 'reviewed' | 'promotable' | 'promoted';

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: 'all', label: 'All', hint: 'Everything in the buffer' },
  { id: 'raw', label: 'Raw', hint: 'Not looked at yet' },
  { id: 'reviewed', label: 'Reviewed', hint: 'You have checked these' },
  { id: 'promotable', label: 'Ready to promote', hint: 'Cleared to become memory' },
  { id: 'promoted', label: 'Promoted', hint: 'Already moved into memory' },
];

const STATUS_LABEL: Record<BlobStats['status'], string> = {
  healthy: 'Plenty of room',
  warning: 'Getting full',
  critical: 'Almost full',
  blocked: 'Full, intake paused',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusColor(status: string) {
  switch (status) {
    case 'healthy': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'critical':
    case 'blocked': return 'bg-danger';
    default: return 'bg-text-disabled';
  }
}

function stateColor(state: string) {
  switch (state) {
    case 'reviewed':
    case 'promotable': return 'bg-accent/10 text-accent-ink';
    case 'promoted': return 'bg-success/10 text-success';
    case 'rejected': return 'bg-danger/10 text-danger';
    case 'expired': return 'bg-bg-secondary text-text-tertiary';
    default: return 'bg-bg-secondary text-text-secondary';
  }
}

function stateLabel(state: string) {
  if (state === 'promotable') return 'Ready to promote';
  return state.charAt(0).toUpperCase() + state.slice(1);
}

const ACTION_DONE: Record<string, string> = {
  review: 'Marked as reviewed.',
  promotable: 'Marked as ready to promote.',
  promote: 'Promoted to memory.',
  reject: 'Item rejected and purged.',
};

const ACTION_VERB: Record<string, string> = {
  review: 'mark',
  promotable: 'mark',
  promote: 'promote',
  reject: 'purge',
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString() : 'Unknown date';
}

export default function BufferControlSurface() {
  const [items, setItems] = useState<BlobItem[]>([]);
  const [stats, setStats] = useState<BlobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const reqId = useRef(0);
  const [statsFailed, setStatsFailed] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [captureMode, setCaptureMode] = useState<'upload' | 'voice' | 'knowledge' | 'link' | 'pulse' | 'device' | 'csv'>('upload');

  // Stats & Ingestion Monitoring
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.blob.stats.path);
      if (res.status === 401) { setSessionEnded(true); return; }
      if (!res.ok) { setStatsFailed(true); return; }
      const data = await res.json();
      if (data && typeof data.usage_percent === 'number') { setStats(data); setStatsFailed(false); }
    } catch (err) {
      console.error('Failed to fetch blob stats', err);
      setStatsFailed(true);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    const myReq = ++reqId.current;
    setLoading(true);
    try {
      const stateFilter = activeTab === 'all' ? '' : `&state=${activeTab}`;
      const res = await fetch(`${API_ENDPOINTS.blob.list.path}?limit=50${stateFilter}`);
      if (myReq !== reqId.current) return; // a newer request superseded this one
      if (res.status === 401) {
        setSessionEnded(true);
        setItems([]);
        return;
      }
      if (!res.ok) {
        // A dead intake store must not look like an empty queue.
        setLoadError('The intake store did not respond, so items cannot be loaded. Retry in a moment.');
        setItems([]);
        return;
      }
      const data = await res.json();
      if (myReq !== reqId.current) return;
      setLoadError(null);
      setSessionEnded(false);
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

  // Capture widgets announce success through toasts and have no completion callback,
  // so refresh the list shortly after a success toast appears.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    toast.onChange((payload) => {
      if (payload.status === 'added' && payload.type === 'success') {
        clearTimeout(timer);
        timer = setTimeout(() => { fetchItems(); fetchStats(); }, 700);
      }
    });
    return () => { clearTimeout(timer); toast.onChange(() => {}); };
  }, [fetchItems, fetchStats]);

  // Switching items always resets the destructive confirmation and stale errors.
  useEffect(() => {
    setConfirmingReject(false);
    setActionError(null);
  }, [selectedId]);

  const handleAction = async (id: string, action: string) => {
    if (busyAction) return;
    setBusyAction(action);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await postBlobAction(action, id);
      if (res.status === 401) {
        setSessionEnded(true);
        setActionError('Your session has ended. Sign in again.');
      } else if (res.ok && action === 'promote') {
        const body = await res.json().catch(() => ({}));
        const outcome = describePromoteOutcome(body);
        if (outcome.closed) setSelectedId(null);
        if (outcome.tone === 'warning' && !outcome.closed) setActionError(outcome.message);
        else setActionNotice(outcome.message);
        setConfirmingReject(false);
        fetchItems();
        fetchStats();
      } else if (res.ok) {
        setActionNotice(ACTION_DONE[action] ?? 'Item updated.');
        if (action === 'reject') setSelectedId(null);
        setConfirmingReject(false);
        fetchItems();
        fetchStats();
      } else {
        let msg = `Could not ${ACTION_VERB[action] ?? 'update'} this item (HTTP ${res.status}). Try again.`;
        try {
          const body = await res.json();
          if (body?.error || body?.message) msg = String(body.error || body.message);
        } catch { /* non-JSON */ }
        setActionError(msg);
      }
    } catch (err) {
      console.error(`Failed to ${action} blob item`, err);
      setActionError(`Network error: the ${ACTION_VERB[action] ?? 'update'} request did not reach the server, so nothing changed. Check your connection and try again.`);
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
  const showAlertStrip = !!stats && stats.status !== 'healthy';

  const toggleSelected = (id: string) => setSelectedId(current => (current === id ? null : id));

  const retry = () => { fetchItems(); fetchStats(); };

  const emptyState = sessionEnded ? (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-danger/40 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-danger">Your session has ended. Sign in again.</p>
      <a href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/buffer')}`} className={`inline-flex min-h-11 items-center rounded-xl border border-danger/40 px-5 text-sm font-semibold text-danger hover:bg-danger/5 ${focusRing}`}>
        Sign in
      </a>
    </div>
  ) : loadError ? (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-danger/40 px-6 py-10 text-center">
      <p className="text-base font-semibold text-danger">{loadError}</p>
      <p className="max-w-sm text-sm text-text-secondary">This is a connection problem, not an empty buffer. Your items are safe.</p>
      <button type="button" onClick={retry} className={`min-h-12 rounded-xl border border-danger/40 px-5 text-sm font-semibold text-danger hover:bg-danger/5 ${focusRing}`}>
        Try again
      </button>
    </div>
  ) : search.trim() ? (
    <EmptyState
      title="No loaded items match your search"
      hint="Search only looks at the items already loaded in this view. Clear the search or switch filters."
      action={
        <button type="button" onClick={() => setSearch('')} className={`min-h-12 rounded-xl border border-border-primary px-5 text-sm font-semibold text-text-primary hover:bg-bg-secondary ${focusRing}`}>
          Clear search
        </button>
      }
    />
  ) : (
    <EmptyState
      title={activeTab === 'all' ? 'The buffer is empty' : `Nothing in "${TABS.find(t => t.id === activeTab)?.label}"`}
      hint={activeTab === 'all' ? 'Upload a file, record a voice note or paste a link. Link, voice and device captures land here for review; uploads, files and imports go straight through the ingestion gate.' : 'Try another filter, or add something new to the buffer.'}
      action={
        <a href="#capture" className={`inline-flex min-h-12 items-center gap-2 rounded-xl bg-text-primary px-5 text-sm font-semibold text-bg-primary hover:bg-accent ${focusRing}`}>
          <Plus size={16} aria-hidden="true" /> Add an item
        </a>
      }
    />
  );

  const itemDetails = selectedItem ? (
    <Card className="motion-safe:animate-in motion-safe:fade-in space-y-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text-primary">Item details</h2>
          <p className="mt-0.5 break-all font-mono text-xs text-text-secondary">{selectedItem.id}</p>
        </div>
        <button
          type="button"
          aria-label="Close details"
          onClick={() => setSelectedId(null)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary ${focusRing}`}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {provenance && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-secondary bg-bg-secondary/40 p-3">
          <span className="text-sm font-semibold text-text-secondary">Authenticity check</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            provenance.reason === 'trusted' ? 'border-success/30 bg-success/5 text-success' : 'border-warning/30 bg-warning/5 text-warning'
          }`}>
            {provenance.reason === 'trusted' ? 'Likely human' : 'Possibly AI-generated'} - {typeof provenance.trustScore === 'number' ? `trust ${Math.round(provenance.trustScore * 100)}%` : 'trust unknown'}
          </span>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-text-primary">Review</h3>
        {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!!busyAction}
            onClick={() => handleAction(selectedItem.id, 'review')}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary disabled:opacity-50 ${focusRing}`}
          >
            <CheckCircle2 size={16} aria-hidden="true" /> {busyAction === 'review' ? 'Saving…' : 'Mark reviewed'}
          </button>
          <button
            type="button"
            disabled={!!busyAction}
            onClick={() => handleAction(selectedItem.id, 'promotable')}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary disabled:opacity-50 ${focusRing}`}
          >
            <ChevronRight size={16} aria-hidden="true" /> {busyAction === 'promotable' ? 'Saving…' : 'Mark ready to promote'}
          </button>
          <button
            type="button"
            disabled={!!busyAction}
            onClick={() => handleAction(selectedItem.id, 'promote')}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-text-primary px-4 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent disabled:opacity-50 sm:col-span-2 ${focusRing}`}
          >
            <RefreshCw size={16} aria-hidden="true" className={busyAction === 'promote' ? 'motion-safe:animate-spin' : ''} /> {busyAction === 'promote' ? 'Promoting…' : 'Promote to memory'}
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border-secondary pt-5">
        <h3 className="text-base font-semibold text-danger">Remove</h3>
        {confirmingReject ? (
          <div role="group" aria-label="Confirm purge" className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="text-sm font-medium text-text-primary">Purge this item?</p>
            <p className="text-sm text-text-secondary">It is deleted from the buffer for good and can&apos;t be recovered.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                autoFocus
                disabled={!!busyAction}
                onClick={() => setConfirmingReject(false)}
                className={`min-h-12 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary disabled:opacity-50 ${focusRing}`}
              >
                Keep item
              </button>
              <button
                type="button"
                disabled={!!busyAction}
                onClick={() => handleAction(selectedItem.id, 'reject')}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-danger px-4 text-sm font-semibold text-bg-primary hover:opacity-90 disabled:opacity-50 ${focusRing}`}
              >
                <Trash2 size={16} aria-hidden="true" /> {busyAction === 'reject' ? 'Purging…' : 'Purge item'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!!busyAction}
            onClick={() => setConfirmingReject(true)}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 ${focusRing}`}
          >
            <Trash2 size={16} aria-hidden="true" /> Reject and purge
          </button>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-text-primary">Payload</h3>
        <pre tabIndex={0} aria-label="Item payload" className={`max-h-64 overflow-auto rounded-xl bg-bg-primary p-4 font-mono text-xs leading-relaxed text-text-secondary ${focusRing}`}>
          {JSON.stringify(selectedItem.raw_payload ?? null, null, 2)}
        </pre>
      </div>
    </Card>
  ) : null;

  return (
    <AppShell>
      <AppToastContainer position="top-center" theme="light" />
      <div className={`mx-auto w-full max-w-7xl ${showAlertStrip ? 'pb-24' : ''}`}>
        {/* Header and capacity */}
        <PageHeader className="mb-6"
          title="Buffer"
          description="Review what is waiting before it becomes memory."
          actions={
            <>
              <a
                href="#capture"
                className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-text-primary px-5 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent lg:hidden ${focusRing}`}
              >
                <Plus size={16} aria-hidden="true" /> Add item
              </a>
              <button
                type="button"
                aria-label="Refresh buffer"
                onClick={retry}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-primary text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary ${focusRing}`}
              >
                <RefreshCw size={18} aria-hidden="true" className={loading ? 'motion-safe:animate-spin' : ''} />
              </button>
            </>
          }
        />
        <div className="-mt-2 mb-6 flex items-center gap-3 rounded-2xl border border-border-primary bg-bg-elevated px-4 py-3 sm:max-w-sm">
          <HardDrive size={18} aria-hidden="true" className="shrink-0 text-text-secondary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm text-text-secondary">
              <span className="truncate">{stats ? STATUS_LABEL[stats.status] : statsFailed ? 'Capacity unavailable' : 'Checking capacity…'}</span>
              <span className="tabular-nums">{stats ? `${stats.usage_percent}%` : ''}</span>
            </div>
            <div
              role="progressbar"
              aria-label="Buffer capacity used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats?.usage_percent ?? 0}
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary"
            >
              <div
                className={`h-full motion-safe:transition-all motion-safe:duration-700 ${stats ? statusColor(stats.status) : 'bg-text-disabled'}`}
                style={{ width: `${stats?.usage_percent || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Item feed comes first on phones; capture tools follow and are one tap away via Add item */}
          <section aria-label="Buffer items" className="space-y-4 lg:order-2 lg:col-span-9">
            <div className="space-y-3">
              <div className="relative">
                <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search loaded items by ID, source or type"
                  placeholder="Search by source, type or ID"
                  className="min-h-12 w-full rounded-full border border-border-primary bg-bg-elevated pl-11 pr-4 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </div>
              <div role="group" aria-label="Filter by review state" className="-mx-4 flex snap-x scroll-pl-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeTab === tab.id}
                    title={tab.hint}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${focusRing} ${
                      activeTab === tab.id
                        ? 'border-text-primary bg-text-primary text-bg-primary'
                        : 'border-border-primary bg-bg-elevated text-text-secondary hover:bg-bg-secondary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p role="status" aria-live="polite" className="text-sm text-text-secondary">
                {loading ? 'Loading items…' : (
                  <>Showing <span className="font-medium text-text-primary">{visibleItems.length}</span> {visibleItems.length === 1 ? 'item' : 'items'}{items.length >= 50 ? ' (the 50 most recent; refine with the filters above)' : ''}</>
                )}
              </p>
            </div>

            <p role="status" className={actionNotice ? 'text-sm font-medium text-success' : 'sr-only'}>{actionNotice ?? ''}</p>

            {/* Phones: one readable card per item, key fields first */}
            <div className="space-y-3 md:hidden" aria-busy={loading}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full motion-reduce:animate-none" />)
              ) : visibleItems.length === 0 ? (
                emptyState
              ) : (
                visibleItems.map(item => (
                  <React.Fragment key={item.id}>
                    <button
                      type="button"
                      aria-pressed={selectedId === item.id}
                      aria-label={`${item.source}, ${item.type}, ${stateLabel(item.state)}. ${selectedId === item.id ? 'Hide' : 'Show'} details`}
                      onClick={() => toggleSelected(item.id)}
                      className={`block min-h-16 w-full rounded-2xl border p-4 text-left transition-colors ${focusRing} ${
                        selectedId === item.id ? 'border-accent/50 bg-accent/10' : 'border-border-primary bg-bg-elevated hover:bg-bg-secondary active:bg-bg-tertiary'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-text-primary">{item.source}</p>
                          <p className="truncate text-sm text-text-secondary">{item.type}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${stateColor(item.state)}`}>{stateLabel(item.state)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-text-secondary">
                        <span className="tabular-nums">{formatSize(item.size)} - {formatDate(item.created_at)}</span>
                        <span className="truncate font-mono" title={item.id}>{item.id.substring(0, 10)}…</span>
                      </div>
                    </button>
                    {selectedId === item.id && itemDetails}
                  </React.Fragment>
                ))
              )}
            </div>

            {/* Tablet and up: table */}
            <div className="hidden md:block" aria-busy={loading}>
              <div role="region" aria-label="Buffer items table, scrollable" tabIndex={0} className="overflow-x-auto rounded-2xl border border-border-primary bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">Buffer items. Select a row to open its details.</caption>
                  <thead>
                    <tr className="border-b border-border-secondary bg-bg-secondary text-xs text-text-secondary">
                      <th scope="col" className="px-5 py-3 font-medium">Source</th>
                      <th scope="col" className="px-5 py-3 font-medium">Type</th>
                      <th scope="col" className="px-5 py-3 font-medium">State</th>
                      <th scope="col" className="px-5 py-3 font-medium">Size</th>
                      <th scope="col" className="px-5 py-3 font-medium">Added</th>
                      <th scope="col" className="px-5 py-3 font-medium">Item ID</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Details</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-secondary text-sm">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="px-5 py-3"><Skeleton className="h-8 w-full motion-reduce:animate-none" /></td>
                        </tr>
                      ))
                    ) : visibleItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4">{emptyState}</td>
                      </tr>
                    ) : (
                      visibleItems.map(item => (
                        <tr
                          key={item.id}
                          onClick={() => toggleSelected(item.id)}
                          className={`cursor-pointer transition-colors hover:bg-bg-secondary ${selectedId === item.id ? 'bg-accent/10' : ''}`}
                        >
                          <td className="px-5 py-3 font-medium text-text-primary">{item.source}</td>
                          <td className="px-5 py-3 text-sm text-text-secondary">{item.type}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stateColor(item.state)}`}>{stateLabel(item.state)}</span>
                          </td>
                          <td className="px-5 py-3 text-sm tabular-nums text-text-secondary">{formatSize(item.size)}</td>
                          <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(item.created_at)}</td>
                          <td className="px-5 py-3 font-mono text-xs text-text-secondary">
                            <span title={item.id}>{item.id.substring(0, 12)}…</span>
                          </td>
                          <td className="px-5 py-1 text-right">
                            <button
                              type="button"
                              aria-label={`${selectedId === item.id ? 'Hide' : 'Show'} details for ${item.source} ${item.type}`}
                              aria-pressed={selectedId === item.id}
                              onClick={e => { e.stopPropagation(); toggleSelected(item.id); }}
                              className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary ${focusRing}`}
                            >
                              <MoreVertical size={16} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {selectedItem && <div className="mt-4">{itemDetails}</div>}
            </div>
          </section>

          {/* Capture tools */}
          <aside id="capture" aria-label="Add to the buffer" className="scroll-mt-20 space-y-4 lg:order-1 lg:col-span-3">
            <Card className="space-y-4 p-5">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Add to the buffer</h2>
                <p className="mt-0.5 text-sm text-text-secondary">Pick how you want to capture something.</p>
              </div>
              <div role="group" aria-label="Capture method" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2">
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
                    className={`min-h-11 rounded-xl px-2 text-sm font-medium transition-colors ${focusRing} ${
                      captureMode === mode ? 'bg-text-primary text-bg-primary' : 'border border-border-primary text-text-secondary hover:bg-bg-secondary'
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
            </Card>
            <Card className="p-5">
              <BufferDeviceTools />
            </Card>
            <p className="flex items-start gap-2 px-1 text-sm text-text-secondary">
              <Inbox size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              Link, voice and device captures wait here until you review and promote them. Uploads, files and imports are ingested directly, and only items the gate flags are held here.
            </p>
          </aside>
        </div>
      </div>

      {/* Storage alert strip */}
      {stats && stats.status !== 'healthy' && (
        <div
          role={stats.status === 'blocked' ? 'alert' : 'status'}
          className={`fixed bottom-[calc(var(--dock-h)+env(safe-area-inset-bottom))] left-0 right-0 z-30 flex items-center justify-center gap-3 px-4 sm:px-6 py-3 md:bottom-0 ${
            stats.status === 'blocked' ? 'bg-danger text-bg-primary' : 'bg-warning text-bg-primary'
          }`}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span className="text-sm font-semibold">
            {stats.status === 'blocked' ? 'The buffer is full, so new items are paused. Promote or purge items to free space.' : 'The buffer is nearly full. Promote or purge items soon.'}
          </span>
        </div>
      )}
    </AppShell>
  );
}
