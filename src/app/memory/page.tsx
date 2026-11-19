"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/app/component/AppShell';
import { PageIntro } from '@/app/component/PageIntro';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { Card, EmptyState, Skeleton } from '@/components/ui/primitives';
import { Database, HardDrive, RefreshCcw, Server, ShieldAlert } from 'lucide-react';
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

function bytesToMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MemoryControlSurface() {
  const [monitor, setMonitor] = useState<MonitorState | null>(null);
  const [packets, setPackets] = useState<any[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const requestSeq = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchMonitor = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const [monitorRes, packetRes] = await Promise.all([
        fetch(API_ENDPOINTS.memory.monitor.path),
        fetch(`${API_ENDPOINTS.memory.packets.path}?limit=100&status=${encodeURIComponent(statusFilter)}&source=${encodeURIComponent(sourceFilter)}`)
      ]);
      if (seq !== requestSeq.current) return;
      if (!monitorRes.ok || !packetRes.ok) {
        // An unreachable memory store must not masquerade as an empty vault.
        setLoadError('The memory store did not respond. This is a connection problem, not an empty vault. Check your connection and retry.');
        return;
      }
      setLoadError(null);
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
  }, [sourceFilter, statusFilter]);

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
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setActionError(j?.error || `${label} failed (${res.status})`);
        return;
      }
      await fetchMonitor();
    } catch {
      setActionError(`${label} failed. Check your connection and try again; nothing was changed.`);
    } finally {
      setBusyAction(null);
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
        <h2 className="text-lg font-semibold text-text-primary">Packet details</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedPacket.status === 'accepted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          {selectedPacket.status}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-base">
        <div>
          <dt className="text-sm text-text-secondary">Source</dt>
          <dd className="mt-0.5 break-words font-medium text-text-primary">{selectedPacket.source}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">Type</dt>
          <dd className="mt-0.5 break-words font-medium text-text-primary">{selectedPacket.type}</dd>
        </div>
      </dl>
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-text-secondary">Payload</h3>
        <pre className="max-h-60 overflow-auto rounded-xl border border-border-secondary bg-bg-primary p-4 font-mono text-xs leading-relaxed text-text-secondary custom-scrollbar">
          {JSON.stringify(selectedPacket.content ?? null, null, 2)}
        </pre>
      </div>

      {actionError ? <p role="alert" className="text-sm text-danger">{actionError}</p> : null}

      <div className="space-y-2">
        <button
          type="button"
          disabled={busyAction !== null}
          onClick={() => replayPacket(selectedPacket.id)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-text-primary px-4 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
        >
          <RefreshCcw size={14} aria-hidden="true" className={busyAction === 'Replay' ? 'motion-safe:animate-spin' : ''} />
          {busyAction === 'Replay' ? 'Replaying…' : 'Replay packet'}
        </button>
        <p className="text-sm text-text-secondary">Replay sends this packet through ingestion again.</p>
      </div>

      <div className="space-y-3 border-t border-border-secondary pt-4">
        {confirmingDelete ? (
          <div role="group" aria-label="Confirm delete" className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="text-sm font-medium text-text-primary">Delete this packet?</p>
            <p className="text-sm text-text-secondary">It is removed from memory permanently and can&apos;t be recovered.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                autoFocus
                disabled={busyAction !== null}
                onClick={() => setConfirmingDelete(false)}
                className="min-h-12 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                Keep packet
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => runDelete(selectedPacket.id)}
                className="min-h-12 rounded-xl bg-danger px-4 text-sm font-semibold text-bg-primary hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
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
            className="min-h-12 w-full rounded-xl border border-danger/30 px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
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
      <PageIntro
        title="Memory"
        description="Your memory vault"
        status={
          <p role="status" className="mt-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${loadError ? 'bg-danger' : !monitor ? 'bg-text-tertiary' : 'bg-success'}`} />
            {loadError ? 'Memory store unreachable' : !monitor ? 'Checking the memory store…' : 'Memory store connected'}
          </p>
        }
        actions={
          <button
            type="button"
            onClick={fetchMonitor}
            disabled={loading}
            className="flex min-h-11 items-center gap-2 rounded-full bg-text-primary px-5 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
          >
            <RefreshCcw size={16} aria-hidden="true" className={loading ? 'motion-safe:animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {monitor?.storage.ingestion_blocked && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger">
          <ShieldAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="text-base font-semibold">Ingestion is locked</p>
            <p className="mt-0.5 text-sm">Storage is over its limit, so new packets are paused. Delete packets you no longer need to free space.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <section aria-label="Memory summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex min-h-28 flex-col justify-between gap-1 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <stat.icon size={18} aria-hidden="true" className={`shrink-0 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              {stat.value === null ? (
                loading ? <Skeleton className="h-7 w-16" /> : <p className="text-xl font-semibold text-text-secondary"><span aria-hidden="true">--</span><span className="sr-only">Unavailable</span></p>
              ) : (
                <p className="text-xl font-semibold tracking-tight text-text-primary tabular-nums">{stat.value}</p>
              )}
              <p className="mt-0.5 text-sm text-text-secondary">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-label="Ingestion packets" className="flex flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-elevated lg:col-span-2">
          <div className="space-y-3 border-b border-border-secondary p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-text-primary">Ingestion packets</h2>
              <p role="status" aria-live="polite" className="text-sm text-text-secondary">
                {loading ? 'Loading…' : `${packets.length} ${packets.length === 1 ? 'packet' : 'packets'}`}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-primary">Status</span>
                <input
                  className="min-h-12 w-full min-w-0 rounded-xl border border-border-primary bg-bg-primary px-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  placeholder="For example accepted or hold"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-primary">Source</span>
                <input
                  className="min-h-12 w-full min-w-0 rounded-xl border border-border-primary bg-bg-primary px-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  placeholder="For example upload"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                />
              </label>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter(''); setSourceFilter(''); }}
                  className="min-h-12 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                  onClick={() => { setSelectedPacket(packet); setConfirmingDelete(false); setActionError(null); }}
                  className={`block min-h-16 w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedPacket?.id === packet.id ? 'border-accent/40 bg-accent/10' : 'border-border-secondary bg-bg-primary hover:border-border-primary active:bg-bg-secondary'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words text-base font-medium text-text-primary">{packet.type}</h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${packet.status === 'accepted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {packet.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
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
                  <p className="text-base font-semibold text-danger">{loadError}</p>
                  <button
                    type="button"
                    onClick={fetchMonitor}
                    className="min-h-12 rounded-xl border border-danger/40 px-5 text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Try again
                  </button>
                </div>
              ) : filtersActive ? (
                <EmptyState
                  title="No packets match these filters"
                  hint="Check the spelling of the status or source, or clear the filters to see everything."
                  action={
                    <button type="button" onClick={() => { setStatusFilter(''); setSourceFilter(''); }} className="min-h-12 rounded-xl border border-border-primary px-5 text-sm font-semibold text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  title="No packets yet"
                  hint="Upload a file on this page, or capture something in the buffer. Accepted items show up here as memory packets."
                  action={
                    <Link href="/buffer" className="inline-flex min-h-12 items-center rounded-xl bg-text-primary px-5 text-sm font-semibold text-bg-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
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
            <ManualUpload heading="h2" onComplete={() => fetchMonitor()} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Storage thresholds</h2>
            <ul className="space-y-4">
              {thresholds.map((row) => (
                <li key={row.threshold} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-text-secondary">Alert at {row.threshold}% full</span>
                    <span className={row.hit ? 'text-warning' : 'text-text-secondary'}>{row.hit ? 'Reached' : 'Not reached'}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <div
                      className={`h-full motion-safe:transition-all motion-safe:duration-700 ${row.hit ? 'bg-warning' : 'bg-border-primary'}`}
                      style={{ width: row.hit ? '100%' : '0%' }}
                    />
                  </div>
                </li>
              ))}
              {!monitor && !loading && <li className="text-sm text-text-secondary">Thresholds appear once the memory store responds.</li>}
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
