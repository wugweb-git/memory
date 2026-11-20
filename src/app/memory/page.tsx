"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/app/component/AppShell';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { Card, EmptyState, Skeleton } from '@/components/ui/primitives';
import { AlertTriangle, Archive, CheckCircle2, Database, Globe, HardDrive, Lock, RefreshCcw, Search, Server, ShieldAlert, XCircle } from 'lucide-react';
import { PACKET_STATUSES, packetStatusView } from './packet-status';
import ManualUpload from '@/app/buffer/components/ManualUpload';

type MonitorState = {
  stats: {
    packet_count: number;
    hold_count: number;
    failed_count: number;
    retry_queue_count: number;
    source_count: number;
    item_count: number;
    growth_rate_per_day: number;
    ingestion_logs: any[];
  };
  storage: {
    used_bytes: number;
    total_bytes: number;
    remaining_bytes: number;
    usage_percent: number;
    ingestion_blocked: boolean;
    ingestion_restricted: boolean;
    alerts: Array<{ threshold: number; level: string }>;
  };
  sources: any[];
  activity: any[];
  documents: any[];
  review_queue: {
    hold: any[];
    failed: any[];
    correction: any[];
  };
};

const TONE_CLASS = { success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', danger: 'bg-danger/10 text-danger', neutral: 'bg-bg-secondary text-text-secondary' } as const;
const STATUS_ICON = { check: CheckCircle2, alert: AlertTriangle, x: XCircle, archive: Archive } as const;

function StatusBadge({ status }: { status: unknown }) {
  const v = packetStatusView(status);
  const Icon = STATUS_ICON[v.icon];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-bold ${TONE_CLASS[v.tone]}`}>
      <Icon size={12} aria-hidden="true" /> {v.label}
    </span>
  );
}

type RetrievalHit = { packet_id: string; chunk: string; score: number; source: string; timestamp: string };

function bytesToMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MemoryControlSurface() {
  const [monitor, setMonitor] = useState<MonitorState | null>(null);
  const [packets, setPackets] = useState<any[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedSource, setAppliedSource] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<RetrievalHit[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const requestSeq = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Debounce filter typing so each keystroke does not refetch.
  useEffect(() => {
    const t = setTimeout(() => { setAppliedStatus(statusFilter); setAppliedSource(sourceFilter); }, 300);
    return () => clearTimeout(t);
  }, [statusFilter, sourceFilter]);

  const fetchMonitor = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const [monitorRes, packetRes] = await Promise.all([
        fetch(API_ENDPOINTS.memory.monitor.path),
        fetch(`${API_ENDPOINTS.memory.packets.path}?limit=100&status=${encodeURIComponent(appliedStatus)}&source=${encodeURIComponent(appliedSource.trim())}`)
      ]);
      if (seq !== requestSeq.current) return;
      if (monitorRes.status === 401 || packetRes.status === 401) {
        setSessionEnded(true);
        setLoadError(null);
        return;
      }
      if (!monitorRes.ok || !packetRes.ok) {
        // An unreachable memory store must not masquerade as an empty vault.
        setLoadError('The memory store did not respond. This is a connection problem, not an empty vault. Check your connection and retry.');
        return;
      }
      setLoadError(null);
      setSessionEnded(false);
      const monitorJson = await monitorRes.json();
      const packetJson = await packetRes.json();
      if (seq !== requestSeq.current) return;
      const rows: any[] = Array.isArray(packetJson.rows) ? packetJson.rows : [];
      setMonitor(monitorJson);
      setPackets(rows);
      // Keep the selection only if it is still in the list (it may be deleted or filtered out).
      setSelectedPacket((current: any) => rows.find((r) => r.id === current?.id) ?? rows[0] ?? null);
    } catch {
      if (seq === requestSeq.current) {
        setLoadError('The memory store did not respond. This is a connection problem, not an empty vault. Check your connection and retry.');
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [appliedSource, appliedStatus]);

  useEffect(() => {
    fetchMonitor();
  }, [fetchMonitor]);

  const thresholds = useMemo(() => {
    if (!monitor) return [];
    return [70, 85, 95].map((threshold) => ({
      threshold,
      hit: monitor.storage.usage_percent >= threshold
    }));
  }, [monitor]);

  const callPacketApi = async (url: string, body: Record<string, string>, label: string) => {
    setBusyAction(label);
    setActionError(null);
    setActionNote(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { setSessionEnded(true); setActionError('Your session has ended. Sign in again.'); return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setActionError(j?.error || `${label} failed (${res.status})`);
        return;
      }
      setActionNote(label === 'Delete' ? 'Packet deleted.' : 'Packet sent through ingestion again.');
      await fetchMonitor();
    } catch {
      setActionError(`${label} failed. Check your connection and try again; nothing was changed.`);
    } finally {
      setBusyAction(null);
    }
  };

  const setPublic = async (packetId: string, isPublic: boolean) => {
    const label = isPublic ? 'Make public' : 'Make private';
    setBusyAction(label);
    setActionError(null);
    setActionNote(null);
    try {
      const res = await fetch('/api/memory/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [packetId], isPublic }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) { setSessionEnded(true); setActionError('Your session has ended. Sign in again.'); return; }
      if (!res.ok) { setActionError(j?.error || `${label} failed (${res.status})`); return; }
      if (isPublic && j.updated === 0) { setActionError('This packet is restricted and cannot be made public.'); return; }
      setPackets((rows) => rows.map((r) => (r.id === packetId ? { ...r, is_public: isPublic } : r)));
      setSelectedPacket((cur: any) => (cur?.id === packetId ? { ...cur, is_public: isPublic } : cur));
      setActionNote(isPublic ? 'Packet is now public. The public chat may quote it.' : 'Packet is now private.');
    } catch {
      setActionError(`${label} failed. Check your connection and try again; nothing was changed.`);
    } finally {
      setBusyAction(null);
    }
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3 || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/memory/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (res.status === 401) { setSessionEnded(true); setHits(null); return; }
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
      setHits(Array.isArray(j.results) ? j.results : []);
    } catch (err) {
      setHits(null);
      setSearchError(`Search failed: ${err instanceof Error ? err.message : 'unknown error'}. Try again.`);
    } finally {
      setSearching(false);
    }
  };

  const runDelete = (packetId: string) =>
    callPacketApi('/api/memory/packet/action', { action: 'delete', packet_id: packetId }, 'Delete').then(() => setConfirmingDelete(false));

  const replayPacket = (packetId: string) =>
    callPacketApi('/api/memory/replay', { packet_id: packetId }, 'Replay');

  const filtersActive = statusFilter.trim() !== '' || sourceFilter.trim() !== '';
  const quarantined = monitor ? monitor.stats.hold_count + monitor.stats.failed_count : null;

  const packetDetails = selectedPacket ? (
    <Card className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">Packet details</h2>
        <StatusBadge status={selectedPacket.status} />
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-text-tertiary">Source</dt>
          <dd className="mt-0.5 break-words font-medium text-text-primary">{selectedPacket.source}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-tertiary">Type</dt>
          <dd className="mt-0.5 break-words font-medium text-text-primary">{selectedPacket.type}</dd>
        </div>
      </dl>
      <div className="space-y-1.5">
        <h3 className="text-xs font-medium text-text-tertiary">Payload</h3>
        <pre className="max-h-60 overflow-auto rounded-xl border border-border-secondary bg-bg-primary p-4 font-mono text-2xs leading-relaxed text-text-secondary custom-scrollbar">
          {JSON.stringify(selectedPacket.content ?? null, null, 2)}
        </pre>
      </div>

      {actionError ? <p role="alert" className="text-xs text-danger">{actionError}</p> : null}

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
          {selectedPacket.is_public
            ? <><Globe size={14} aria-hidden="true" className="text-success" /> Public: the public chat may quote it</>
            : <><Lock size={14} aria-hidden="true" className="text-text-tertiary" /> Private: only you can see it</>}
        </p>
        <button
          type="button"
          disabled={busyAction !== null}
          onClick={() => setPublic(selectedPacket.id, !selectedPacket.is_public)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary disabled:opacity-50"
        >
          {busyAction === 'Make public' || busyAction === 'Make private' ? 'Saving…' : selectedPacket.is_public ? 'Make private' : 'Make public'}
        </button>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={busyAction !== null}
          onClick={() => replayPacket(selectedPacket.id)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-text-primary px-4 text-sm font-bold text-bg-primary transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCcw size={14} aria-hidden="true" className={busyAction === 'Replay' ? 'motion-safe:animate-spin' : ''} />
          {busyAction === 'Replay' ? 'Replaying…' : 'Replay packet'}
        </button>
        <p className="text-xs text-text-tertiary">Replay sends this packet through ingestion again.</p>
      </div>

      <div className="space-y-3 border-t border-border-secondary pt-4">
        {confirmingDelete ? (
          <div role="group" aria-label="Confirm delete" className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="text-sm font-medium text-text-primary">Delete this packet?</p>
            <p className="text-xs text-text-secondary">It is removed from memory permanently and can&apos;t be recovered.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                autoFocus
                disabled={busyAction !== null}
                onClick={() => setConfirmingDelete(false)}
                className="min-h-11 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary disabled:opacity-50"
              >
                Keep packet
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => runDelete(selectedPacket.id)}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-bold text-bg-primary hover:opacity-90 disabled:opacity-50"
              >
                {busyAction === 'Delete' ? 'Deleting…' : 'Delete packet'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => setConfirmingDelete(true)}
            className="min-h-11 w-full rounded-xl border border-danger/30 px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            Delete packet
          </button>
        )}
      </div>
    </Card>
  ) : null;

  const stats = [
    { label: 'Storage used', value: monitor ? `${monitor.storage.usage_percent}%` : null, sub: monitor ? `${bytesToMb(monitor.storage.used_bytes)} of ${bytesToMb(monitor.storage.total_bytes)}` : '', icon: HardDrive, color: 'text-accent' },
    { label: 'Memory packets', value: monitor ? String(monitor.stats.packet_count) : null, sub: 'Stored memory units', icon: Database, color: 'text-accent' },
    { label: 'Needs attention', value: quarantined === null ? null : String(quarantined), sub: 'Held or failed packets', icon: ShieldAlert, color: 'text-warning' },
    { label: 'Sources', value: monitor ? String(monitor.stats.source_count) : null, sub: `${monitor?.stats.growth_rate_per_day ?? 0} new per day`, icon: Server, color: 'text-success' },
  ];

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border-secondary bg-secondary">
            <Database size={20} aria-hidden="true" className="text-text-tertiary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-primary">Memory</h1>
            <p role="status" className="mt-1 flex items-center gap-2 text-sm font-medium text-text-tertiary">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${loadError ? 'bg-danger' : 'bg-success'}`} />
              {loadError ? 'Memory store unreachable' : 'Your memory vault'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchMonitor}
          disabled={loading}
          className="flex min-h-11 items-center gap-2 rounded-full bg-text-primary px-5 text-xs font-bold text-bg-primary transition-colors hover:bg-accent disabled:opacity-60"
        >
          <RefreshCcw size={14} aria-hidden="true" className={loading ? 'motion-safe:animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <p role="status" className={actionNote ? 'mb-4 text-sm font-medium text-success' : 'sr-only'}>{actionNote ?? ''}</p>

      {sessionEnded && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger">
          <p className="text-sm font-medium">Your session has ended. Sign in again.</p>
          <a href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/memory')}`} className="inline-flex min-h-11 items-center rounded-xl border border-danger/40 px-5 text-xs font-bold text-danger hover:bg-danger/5">Sign in</a>
        </div>
      )}

      <Card className="mb-6 space-y-4 p-4 sm:p-5">
        <form onSubmit={runSearch} role="search" className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="memory-search" className="sr-only">Search your memory</label>
          <div className="relative min-w-0 flex-1">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              id="memory-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your notes by meaning (3 characters or more)"
              className="min-h-11 w-full rounded-xl border border-border-primary bg-bg-primary pl-10 pr-4 text-base text-text-primary sm:text-sm placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={searching || query.trim().length < 3}
            className="min-h-11 rounded-xl bg-text-primary px-5 text-sm font-bold text-bg-primary transition-colors hover:bg-accent disabled:opacity-50"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        <div role="status" aria-live="polite">
          {searchError ? <p role="alert" className="text-sm text-danger">{searchError}</p> : null}
          {hits && hits.length === 0 ? <p className="text-sm text-text-secondary">No notes matched that search. Try different words.</p> : null}
        </div>
        {hits && hits.length > 0 && (
          <ul className="space-y-3">
            {hits.map((h, i) => (
              <li key={`${h.packet_id}-${i}`} className="rounded-xl border border-border-secondary bg-bg-primary p-4">
                <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{h.chunk}</p>
                <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-text-tertiary">
                  <span className="font-medium text-text-secondary">{h.source}</span>
                  {h.timestamp ? <span>{new Date(h.timestamp).toLocaleDateString()}</span> : null}
                  {typeof h.score === 'number' ? <span>Match {Math.round(h.score * 100)}%</span> : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {loadError && packets.length > 0 && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger">
          <p className="text-sm font-medium">{loadError} The list below may be out of date.</p>
          <button type="button" onClick={fetchMonitor} className="min-h-11 rounded-xl border border-danger/40 px-5 text-xs font-bold text-danger hover:bg-danger/5">Try again</button>
        </div>
      )}

      {monitor?.storage.ingestion_blocked && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger">
          <ShieldAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Ingestion is locked</p>
            <p className="mt-0.5 text-xs">Storage is over its limit, so new packets are paused. Delete packets you no longer need to free space.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <section aria-label="Memory summary" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex items-start justify-between gap-2 p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-tertiary">{stat.label}</p>
              {stat.value === null ? (
                loading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 text-2xl font-black text-text-tertiary">--</p>
              ) : (
                <p className="mt-1 text-2xl font-black tracking-tight text-text-primary tabular-nums">{stat.value}</p>
              )}
              <p className="mt-1 text-2xs text-text-tertiary">{stat.sub}</p>
            </div>
            <stat.icon size={18} aria-hidden="true" className={`shrink-0 ${stat.color}`} />
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-label="Ingestion packets" className="flex flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-elevated lg:col-span-2">
          <div className="space-y-3 border-b border-border-secondary p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-text-primary">Ingestion packets</h2>
              <p role="status" aria-live="polite" className="text-xs text-text-tertiary">
                {loading ? 'Loading…' : `${packets.length} ${packets.length === 1 ? 'packet' : 'packets'}`}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Status</span>
                <select
                  className="min-h-11 w-full min-w-0 rounded-xl border border-border-primary bg-bg-primary px-3 text-base text-text-primary sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {PACKET_STATUSES.map((s) => <option key={s} value={s}>{packetStatusView(s).label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Source</span>
                <input
                  className="min-h-11 w-full min-w-0 rounded-xl border border-border-primary bg-bg-primary px-3 text-base text-text-primary sm:text-sm placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  placeholder="For example manual, github or rss"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                />
              </label>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter(''); setSourceFilter(''); }}
                  className="min-h-11 rounded-xl border border-border-primary px-4 text-xs font-bold text-text-secondary hover:bg-bg-secondary"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-auto p-4 custom-scrollbar sm:p-5" aria-busy={loading}>
            {packets.map((packet) => (
              <React.Fragment key={packet.id}>
                <button
                  type="button"
                  aria-pressed={selectedPacket?.id === packet.id}
                  onClick={() => { setSelectedPacket(packet); setConfirmingDelete(false); setActionError(null); setActionNote(null); }}
                  className={`block min-h-11 w-full rounded-xl border p-4 text-left transition-colors ${selectedPacket?.id === packet.id ? 'border-accent/40 bg-accent/10' : 'border-border-secondary bg-bg-primary hover:border-border-primary'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words text-sm font-semibold text-text-primary">{packet.type}</span>
                    <StatusBadge status={packet.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                    <span className="font-medium text-text-secondary">{packet.source}</span>
                    <span>{packet.retry_count ?? 0} {(packet.retry_count ?? 0) === 1 ? 'attempt' : 'attempts'}</span>
                    {packet.ingestion_time ? <span>{new Date(packet.ingestion_time).toLocaleString()}</span> : null}
                  </div>
                </button>
                {/* On phones the details open right under the packet, not far below the list */}
                {selectedPacket?.id === packet.id && <div className="lg:hidden">{packetDetails}</div>}
              </React.Fragment>
            ))}
            {!packets.length && (
              loading && !loadError ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : loadError ? (
                <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-danger/40 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-danger">{loadError}</p>
                  <button
                    type="button"
                    onClick={fetchMonitor}
                    className="min-h-11 rounded-xl border border-danger/40 px-5 text-xs font-bold text-danger hover:bg-danger/5"
                  >
                    Try again
                  </button>
                </div>
              ) : filtersActive ? (
                <EmptyState
                  title="No packets match these filters"
                  hint="Check the spelling of the source, or clear the filters to see everything."
                  action={
                    <button type="button" onClick={() => { setStatusFilter(''); setSourceFilter(''); }} className="min-h-11 rounded-xl border border-border-primary px-5 text-xs font-bold text-text-primary hover:bg-bg-secondary">
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  title="No packets yet"
                  hint="Upload a file on this page, or capture something in the buffer. Active items show up here as memory packets."
                  action={
                    <Link href="/buffer" className="inline-flex min-h-11 items-center rounded-xl bg-text-primary px-5 text-xs font-bold text-bg-primary hover:bg-accent">
                      Open the buffer
                    </Link>
                  }
                />
              )
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <Card className="p-5">
            <ManualUpload onComplete={() => fetchMonitor()} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Storage thresholds</h2>
            <ul className="space-y-4">
              {thresholds.map((row) => (
                <li key={row.threshold} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-text-secondary">Alert at {row.threshold}% full</span>
                    <span className={row.hit ? 'text-warning' : 'text-text-tertiary'}>{row.hit ? 'Reached' : 'Not reached'}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <div
                      className={`h-full motion-safe:transition-all motion-safe:duration-700 ${row.hit ? 'bg-warning' : 'bg-border-primary'}`}
                      style={{ width: row.hit ? '100%' : '0%' }}
                    />
                  </div>
                </li>
              ))}
              {!monitor && !loading && <li className="text-xs text-text-tertiary">Thresholds appear once the memory store responds.</li>}
            </ul>
          </Card>

          <div className="hidden lg:block">
            {packetDetails ?? (
              <EmptyState title="Select a packet" hint="Pick a packet from the list to inspect it, replay it or delete it." />
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
