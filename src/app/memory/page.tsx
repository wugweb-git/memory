"use client";

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Database, FileLock2, Folder, HardDrive, Home, RefreshCcw, Server, ShieldAlert } from 'lucide-react';

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

const SIDEBAR_ITEMS = [
  { label: 'Home', icon: Home },
  { label: 'Activity', icon: Activity },
  { label: 'Knowledge', icon: Database },
  { label: 'Documents', icon: Folder },
  { label: 'Sources', icon: Server },
  { label: 'Storage', icon: HardDrive },
  { label: 'Buffer (Blob)', icon: FileLock2 }
];

function bytesToMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MemoryControlSurface() {
  const [monitor, setMonitor] = useState<MonitorState | null>(null);
  const [packets, setPackets] = useState<any[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMonitor = async () => {
    setLoading(true);
    try {
      const [monitorRes, packetRes] = await Promise.all([
        fetch('/api/memory/monitor'),
        fetch(`/api/memory/packets?limit=100&status=${encodeURIComponent(statusFilter)}&source=${encodeURIComponent(sourceFilter)}`)
      ]);
      if (!monitorRes.ok || !packetRes.ok) return;
      const monitorJson = await monitorRes.json();
      const packetJson = await packetRes.json();
      setMonitor(monitorJson);
      setPackets(packetJson.rows || []);
      if (packetJson.rows?.length && !selectedPacket) setSelectedPacket(packetJson.rows[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
  }, [statusFilter, sourceFilter]);

  const thresholds = useMemo(() => {
    if (!monitor) return [];
    return [70, 85, 95].map((threshold) => ({
      threshold,
      hit: monitor.storage.usage_percent >= threshold
    }));
  }, [monitor]);

  const runAction = async (action: string, packetId: string) => {
    const res = await fetch('/api/memory/packet/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, packet_id: packetId })
    });
    if (res.ok) fetchMonitor();
  };

  const replayPacket = async (packetId: string) => {
    const res = await fetch('/api/memory/replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packet_id: packetId })
    });
    if (res.ok) fetchMonitor();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className="w-64 border-r border-zinc-800 px-4 py-6 space-y-2">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] mb-6 text-zinc-400">Layer 1 Memory</h1>
        {SIDEBAR_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/40 text-sm">
            <item.icon size={16} className="text-cyan-400" />
            <span>{item.label}</span>
          </div>
        ))}
      </aside>

      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Memory Control Surface</h2>
            <p className="text-xs text-zinc-400">Controlled ingestion, deterministic storage, and full traceability.</p>
          </div>
          <button className="px-3 py-2 rounded bg-cyan-500/20 border border-cyan-500/50 text-xs flex items-center gap-2" onClick={fetchMonitor}>
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <p className="text-xs text-zinc-400">Storage usage</p>
            <p className="text-lg font-semibold">{monitor ? `${monitor.storage.usage_percent}%` : '--'}</p>
            <p className="text-xs text-zinc-500">{monitor ? `${bytesToMb(monitor.storage.used_bytes)} / ${bytesToMb(monitor.storage.total_bytes)}` : ''}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <p className="text-xs text-zinc-400">Packets</p>
            <p className="text-lg font-semibold">{monitor?.stats.packet_count ?? '--'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <p className="text-xs text-zinc-400">Review queue</p>
            <p className="text-lg font-semibold">{monitor ? monitor.stats.hold_count + monitor.stats.failed_count : '--'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <p className="text-xs text-zinc-400">Sources</p>
            <p className="text-lg font-semibold">{monitor?.stats.source_count ?? '--'}</p>
            <p className="text-xs text-zinc-500">Growth/day: {monitor?.stats.growth_rate_per_day ?? '--'}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Ingestion Monitor</h3>
              <div className="flex gap-2">
                <input className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs" placeholder="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
                <input className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs" placeholder="source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto">
              {packets.map((packet) => (
                <button
                  type="button"
                  key={packet._id}
                  onClick={() => setSelectedPacket(packet)}
                  className="w-full text-left p-3 rounded border border-zinc-800 bg-zinc-950/60 hover:border-cyan-500/40"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{packet.type}</span>
                    <span className="text-zinc-400">{packet.status}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{packet.source} • retries: {packet.trace?.retry_count ?? 0}</p>
                </button>
              ))}
              {!packets.length && <p className="text-xs text-zinc-500">No packets yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <h3 className="text-sm font-semibold mb-3">Storage Monitor</h3>
            <div className="space-y-2 text-xs">
              {thresholds.map((row) => (
                <div key={row.threshold} className={`flex items-center justify-between p-2 rounded ${row.hit ? 'bg-amber-500/10 text-amber-300' : 'bg-zinc-900 text-zinc-400'}`}>
                  <span>{row.threshold}%</span>
                  <span>{row.hit ? 'triggered' : 'idle'}</span>
                </div>
              ))}
              {monitor?.storage.ingestion_blocked && (
                <div className="p-2 rounded bg-red-500/20 text-red-300 flex items-center gap-2"><ShieldAlert size={14} /> Ingestion blocked</div>
              )}
              {monitor?.storage.ingestion_restricted && !monitor.storage.ingestion_blocked && (
                <div className="p-2 rounded bg-amber-500/20 text-amber-300 flex items-center gap-2"><AlertTriangle size={14} /> Ingestion restricted</div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <h3 className="text-sm font-semibold mb-3">Packet Inspector</h3>
            {selectedPacket ? (
              <div className="space-y-2 text-xs">
                <p><span className="text-zinc-400">Source:</span> {selectedPacket.source}</p>
                <p><span className="text-zinc-400">Ingestion path:</span> {selectedPacket.trace?.ingestion_path}</p>
                <p><span className="text-zinc-400">Timestamp:</span> {selectedPacket.ingestion_time}</p>
                <p><span className="text-zinc-400">Status:</span> {selectedPacket.status}</p>
                <p><span className="text-zinc-400">Retries:</span> {selectedPacket.trace?.retry_count ?? 0}</p>
                <pre className="max-h-56 overflow-auto p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px]">{JSON.stringify(selectedPacket.content, null, 2)}</pre>
                <div className="flex gap-2 flex-wrap">
                  <button className="px-2 py-1 rounded bg-zinc-800" onClick={() => runAction('delete', selectedPacket._id)}>Delete</button>
                  <button className="px-2 py-1 rounded bg-zinc-800" onClick={() => runAction('move_to_blob', selectedPacket._id)}>Move to Blob</button>
                  <button className="px-2 py-1 rounded bg-zinc-800" onClick={() => runAction('reprocess', selectedPacket._id)}>Reprocess</button>
                  <button className="px-2 py-1 rounded bg-zinc-800" onClick={() => replayPacket(selectedPacket._id)}>Replay</button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Select a packet to inspect raw content and trace metadata.</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <h3 className="text-sm font-semibold mb-3">Source Control & Review Queue</h3>
            <div className="space-y-2 text-xs mb-4 max-h-32 overflow-auto">
              {monitor?.sources?.map((source) => (
                <div key={source._id} className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <p>{source.source_type} • trust {source.trust_score}</p>
                  <p className="text-zinc-500">last sync: {source.last_sync || 'never'} • failures: {source.failure_count ?? 0}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-xs">
              <p>HOLD: {monitor?.review_queue.hold?.length ?? 0}</p>
              <p>FAILED: {monitor?.review_queue.failed?.length ?? 0}</p>
              <p>CORRECTION: {monitor?.review_queue.correction?.length ?? 0}</p>
              <p className="text-zinc-500">Restricted packets are encrypted-at-rest flagged and excluded from automatic replay.</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Activity Feed</h3>
              <input
                className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs"
                placeholder="filter by source/type"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-48 overflow-auto text-xs">
              {monitor?.activity
                ?.filter((row) => {
                  if (!activityFilter) return true;
                  const haystack = `${row.source || ''} ${row.type || ''}`.toLowerCase();
                  return haystack.includes(activityFilter.toLowerCase());
                })
                .map((row) => (
                  <div key={row._id} className="p-2 rounded border border-zinc-800 bg-zinc-950">
                    <p>{row.source} • {row.type}</p>
                    <p className="text-zinc-500">{row.status} • {row.event_time}</p>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
            <h3 className="text-sm font-semibold mb-3">Ingestion Decisions</h3>
            <div className="space-y-2 max-h-48 overflow-auto text-xs">
              {monitor?.stats?.ingestion_logs?.map((log) => (
                <div key={log._id} className="p-2 rounded border border-zinc-800 bg-zinc-950">
                  <p>{log.source} → {log.decision}</p>
                  <p className="text-zinc-500">{log.reason} • retries: {log.retry_count ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/40">
          <h3 className="text-sm font-semibold mb-3">Documents Panel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {(monitor?.documents || []).map((doc: any) => (
              <div key={doc._id} className="p-2 rounded border border-zinc-800 bg-zinc-950">
                <p className="font-medium">{doc.type}</p>
                <p className="text-zinc-500">{doc.title || 'Untitled'}</p>
                <p className="text-zinc-500">{doc.encryption_required ? 'Encrypted' : 'Standard'} • {doc.restricted_access ? 'Restricted' : 'Accessible'}</p>
              </div>
            ))}
            {!(monitor?.documents || []).length && <p className="text-zinc-500">No documents indexed.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
