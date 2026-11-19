"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/app/component/AppShell';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { Activity, Database, HardDrive, RefreshCcw, Server, ShieldAlert } from 'lucide-react';
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
        setLoadError('Memory store unreachable — this is a connection problem, not an empty vault.');
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
        setLoadError('Memory store unreachable — this is a connection problem, not an empty vault.');
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
      setActionError(`${label} failed. Check your connection and try again.`);
    } finally {
      setBusyAction(null);
    }
  };

  const runAction = (action: string, packetId: string) => {
    if (action === 'delete' && !window.confirm('Delete this packet permanently? This cannot be undone.')) return;
    return callPacketApi('/api/memory/packet/action', { action, packet_id: packetId }, 'Delete');
  };

  const replayPacket = (packetId: string) =>
    callPacketApi('/api/memory/replay', { packet_id: packetId }, 'Replay');

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
            <Database size={20} className="text-text-tertiary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary">Memory</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${loadError ? 'bg-danger' : 'bg-success'}`} />
              <p className="text-sm text-text-tertiary font-medium">{loadError ? 'Memory store unreachable' : 'L1 memory vault'}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchMonitor}
          disabled={loading}
          className="min-h-11 px-5 py-2.5 rounded-full bg-text-primary text-bg-primary text-xs font-bold flex items-center gap-2 hover:bg-accent transition-colors disabled:opacity-60"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Storage usage', value: monitor ? `${monitor.storage.usage_percent}%` : '--', sub: monitor ? `${bytesToMb(monitor.storage.used_bytes)} / ${bytesToMb(monitor.storage.total_bytes)}` : '', icon: HardDrive, color: 'text-accent' },
          { label: 'Memory packets', value: monitor?.stats.packet_count ?? '--', sub: 'Total atomic units', icon: Database, color: 'text-accent' },
          { label: 'Quarantine queue', value: monitor ? monitor.stats.hold_count + monitor.stats.failed_count : '--', sub: 'Awaiting validation', icon: ShieldAlert, color: 'text-warning' },
          { label: 'Sources', value: monitor?.stats.source_count ?? '--', sub: `Growth: ${monitor?.stats.growth_rate_per_day ?? 0}/day`, icon: Server, color: 'text-success' }
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-radius-xl border border-border-secondary p-5 flex items-start justify-between">
            <div>
              <p className="text-2xs uppercase tracking-widest text-text-tertiary font-bold mb-1">{stat.label}</p>
              <p className="text-2xl font-black tracking-tight text-text-primary">{stat.value}</p>
              <p className="text-2xs text-text-disabled font-medium mt-1">{stat.sub}</p>
            </div>
            <stat.icon size={20} className={stat.color} />
          </div>
        ))}
      </section>

      {/* Intelligence Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 glass-panel rounded-radius-xl border border-border-secondary overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-border-secondary flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Ingestion packets</h3>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <input className="min-h-11 w-full min-w-0 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-secondary text-xs text-text-primary focus:border-accent/50 transition-colors" aria-label="Filter status" placeholder="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
              <input className="min-h-11 w-full min-w-0 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-secondary text-xs text-text-primary focus:border-accent/50 transition-colors" aria-label="Filter source" placeholder="Filter by source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-3" aria-busy={loading}>
            {packets.map((packet) => (
              <button
                type="button"
                key={packet.id}
                onClick={() => setSelectedPacket(packet)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedPacket?.id === packet.id ? 'bg-accent/10 border-accent/40' : 'bg-bg-primary border-border-secondary hover:border-border-primary'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-2xs font-bold uppercase ${packet.status === 'accepted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {packet.status}
                  </span>
                  <span className="text-2xs font-mono text-text-tertiary">{packet.ingestion_time ? new Date(packet.ingestion_time).toLocaleString() : ""}</span>
                </div>
                <h4 className="text-sm font-bold tracking-tight mb-1 text-text-primary">{packet.type}</h4>
                <div className="flex items-center gap-2 text-2xs text-text-tertiary">
                  <span className="font-medium text-text-secondary">{packet.source}</span>
                  <span className="w-1 h-1 rounded-full bg-border-primary" />
                  <span>Attempts: {packet.retry_count ?? 0}</span>
                </div>
              </button>
            ))}
            {!packets.length && (
              loading && !loadError ? (
                <div className="h-40 flex items-center justify-center text-text-tertiary border border-dashed border-border-secondary rounded-2xl">
                  <p className="text-xs font-bold">Loading packets…</p>
                </div>
              ) : loadError ? (
                <div className="h-40 flex flex-col items-center justify-center gap-3 text-danger border border-dashed border-danger/30 rounded-2xl px-6 text-center">
                  <p className="text-sm font-bold">{loadError}</p>
                  <button
                    type="button"
                    onClick={fetchMonitor}
                    className="px-4 py-1.5 rounded-xl border border-danger/40 text-xs font-bold hover:bg-danger/5"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-text-disabled border border-dashed border-border-secondary rounded-2xl">
                  <Database size={24} className="mb-2 opacity-40" />
                  <p className="text-xs font-bold">No packets yet</p>
                </div>
              )
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="glass-panel rounded-radius-xl border border-border-secondary p-6">
            <ManualUpload onComplete={() => fetchMonitor()} />
          </section>

          <section className="glass-panel rounded-radius-xl border border-border-secondary p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-tertiary mb-5">Storage thresholds</h3>
            <div className="space-y-4">
              {thresholds.map((row) => (
                <div key={row.threshold} className="space-y-2">
                  <div className="flex items-center justify-between text-2xs font-bold">
                    <span className="text-text-tertiary uppercase tracking-tighter">Capacity threshold {row.threshold}%</span>
                    <span className={row.hit ? 'text-warning' : 'text-text-disabled'}>{row.hit ? 'Triggered' : 'Ready'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${row.hit ? 'bg-warning' : 'bg-border-primary'}`}
                      style={{ width: row.hit ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              ))}

              {monitor?.storage.ingestion_blocked && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
                  <ShieldAlert size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest leading-none">Ingestion locked</p>
                    <p className="text-2xs font-medium opacity-70 mt-1">Storage limit exceeded. Actions restricted.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-radius-xl border border-border-secondary p-6 overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-tertiary mb-5">Packet details</h3>
            {selectedPacket ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-2xs text-text-tertiary font-bold uppercase">Status</p>
                    <p className="text-2xs font-mono uppercase text-success">{selectedPacket.status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xs text-text-tertiary font-bold uppercase">Source</p>
                    <p className="text-2xs font-mono uppercase text-text-secondary">{selectedPacket.source}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-2xs text-text-tertiary font-bold uppercase">Payload</p>
                  <pre className="max-h-60 overflow-auto p-4 rounded-xl bg-bg-primary border border-border-secondary text-2xs font-mono text-text-secondary custom-scrollbar leading-relaxed">
                    {JSON.stringify(selectedPacket.content ?? null, null, 2)}
                  </pre>
                </div>

                {actionError ? <p role="alert" className="text-2xs text-danger">{actionError}</p> : null}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button type="button" disabled={busyAction !== null} onClick={() => runAction('delete', selectedPacket.id)} className="min-h-11 disabled:opacity-50 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-2xs font-bold text-danger uppercase hover:bg-danger/20 transition-colors">Delete</button>
                  <button type="button" disabled={busyAction !== null} onClick={() => replayPacket(selectedPacket.id)} className="min-h-11 disabled:opacity-50 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-2xs font-bold text-accent uppercase hover:bg-accent/20 transition-colors">Replay</button>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-text-disabled border border-dashed border-border-secondary rounded-2xl">
                <Activity size={20} className="mb-2 opacity-40" />
                <p className="text-2xs font-bold uppercase tracking-widest">Select a packet</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
