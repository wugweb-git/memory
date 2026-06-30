"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/app/component/AppShell';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
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
  const [activeSidebarItem, setActiveSidebarItem] = useState('Home');
  const [loading, setLoading] = useState(false);

  const fetchMonitor = useCallback(async () => {
    setLoading(true);
    try {
      const [monitorRes, packetRes] = await Promise.all([
        fetch(API_ENDPOINTS.memory.monitor.path),
        fetch(`${API_ENDPOINTS.memory.packets.path}?limit=100&status=${encodeURIComponent(statusFilter)}&source=${encodeURIComponent(sourceFilter)}`)
      ]);
      if (!monitorRes.ok || !packetRes.ok) return;
      const monitorJson = await monitorRes.json();
      const packetJson = await packetRes.json();
      setMonitor(monitorJson);
      setPackets(packetJson.rows || []);
      if (packetJson.rows?.length) {
        setSelectedPacket((current: any) => current ?? packetJson.rows[0]);
      }
    } finally {
      setLoading(false);
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
    <AppShell>
      <header className="flex items-end justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
            <Database size={20} className="text-text-tertiary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary">Memory</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <p className="text-sm text-text-tertiary font-medium">L1 baseline active · secure enclave</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchMonitor}
          className="px-5 py-2.5 rounded-full bg-text-primary text-bg-primary text-xs font-bold flex items-center gap-2 hover:bg-accent transition-colors"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Storage Usage', value: monitor ? `${monitor.storage.usage_percent}%` : '--', sub: monitor ? `${bytesToMb(monitor.storage.used_bytes)} / ${bytesToMb(monitor.storage.total_bytes)}` : '', icon: HardDrive, color: 'text-accent' },
          { label: 'Neural Packets', value: monitor?.stats.packet_count ?? '--', sub: 'Total atomic units', icon: Database, color: 'text-accent' },
          { label: 'Quarantine Queue', value: monitor ? monitor.stats.hold_count + monitor.stats.failed_count : '--', sub: 'Awaiting validation', icon: ShieldAlert, color: 'text-warning' },
          { label: 'Source Integrity', value: monitor?.stats.source_count ?? '--', sub: `Growth: ${monitor?.stats.growth_rate_per_day ?? 0}/day`, icon: Server, color: 'text-success' }
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
          <div className="px-6 py-5 border-b border-border-secondary flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Ingestion Matrix</h3>
            </div>
            <div className="flex gap-2">
              <input className="px-3 py-1.5 rounded-lg bg-bg-primary border border-border-secondary text-xs text-text-primary focus:border-accent/50 transition-colors" placeholder="Filter status..." value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
              <input className="px-3 py-1.5 rounded-lg bg-bg-primary border border-border-secondary text-xs text-text-primary focus:border-accent/50 transition-colors" placeholder="Filter source..." value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-3">
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
                  <span className="text-2xs font-mono text-text-tertiary">{new Date(packet.ingestion_time).toLocaleTimeString()}</span>
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
              <div className="h-40 flex flex-col items-center justify-center text-text-disabled border border-dashed border-border-secondary rounded-2xl">
                <Database size={24} className="mb-2 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-widest">No Packets Detected</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="glass-panel rounded-radius-xl border border-border-secondary p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-tertiary mb-5">Storage Topology</h3>
            <div className="space-y-4">
              {thresholds.map((row) => (
                <div key={row.threshold} className="space-y-2">
                  <div className="flex items-center justify-between text-2xs font-bold">
                    <span className="text-text-tertiary uppercase tracking-tighter">Capacity Threshold {row.threshold}%</span>
                    <span className={row.hit ? 'text-warning' : 'text-text-disabled'}>{row.hit ? 'TRIGGERED' : 'READY'}</span>
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
                    <p className="text-xs font-bold uppercase tracking-widest leading-none">Ingestion Hard Lock</p>
                    <p className="text-2xs font-medium opacity-70 mt-1">Storage limit exceeded. Actions restricted.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-radius-xl border border-border-secondary p-6 overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-tertiary mb-5">Packet Diagnostics</h3>
            {selectedPacket ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-2xs text-text-tertiary font-bold uppercase">Integrity</p>
                    <p className="text-2xs font-mono uppercase text-success">{selectedPacket.status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xs text-text-tertiary font-bold uppercase">Source Access</p>
                    <p className="text-2xs font-mono uppercase text-text-secondary">{selectedPacket.source}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-2xs text-text-tertiary font-bold uppercase">Payload Matrix</p>
                  <pre className="max-h-60 overflow-auto p-4 rounded-xl bg-bg-primary border border-border-secondary text-2xs font-mono text-text-secondary custom-scrollbar leading-relaxed">
                    {JSON.stringify(selectedPacket.content, null, 2)}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={() => runAction('delete', selectedPacket.id)} className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-2xs font-bold text-danger uppercase hover:bg-danger/20 transition-colors">Terminate</button>
                  <button onClick={() => replayPacket(selectedPacket.id)} className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-2xs font-bold text-accent uppercase hover:bg-accent/20 transition-colors">Replay</button>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-text-disabled border border-dashed border-border-secondary rounded-2xl">
                <Activity size={20} className="mb-2 opacity-40" />
                <p className="text-2xs font-bold uppercase tracking-widest">Select Packet</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
