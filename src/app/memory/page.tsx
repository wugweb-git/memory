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
    <div className="min-h-screen bg-black text-white flex overflow-hidden selection:bg-cyan-500/30">
      {/* Scanline Effect */}
      <div className="scanline" />
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 px-4 py-8 space-y-2 backdrop-blur-xl bg-zinc-950/40 z-10">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Database className="text-white" size={18} />
          </div>
          <h1 className="text-sm font-bold uppercase tracking-[.25em] bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Identity Prism</h1>
        </div>

        <nav className="space-y-1">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 px-3">Lifecycle Control</h2>
          {SIDEBAR_ITEMS.map((item) => (
            <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <item.icon size={16} className="group-hover:text-cyan-400 transition-colors" />
              <span className="font-medium tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar z-10">
        <header className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Memory Control Surface</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm text-zinc-400 font-medium">L1 Neural Baseline Active • Secure Enclave Hardened</p>
            </div>
          </div>
          <button 
            onClick={fetchMonitor}
            className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors shadow-xl shadow-white/5"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH MATRIX
          </button>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Storage Usage', value: monitor ? `${monitor.storage.usage_percent}%` : '--', sub: monitor ? `${bytesToMb(monitor.storage.used_bytes)} / ${bytesToMb(monitor.storage.total_bytes)}` : '', icon: HardDrive, color: 'text-cyan-400' },
            { label: 'Neural Packets', value: monitor?.stats.packet_count ?? '--', sub: 'Total atomic units', icon: Database, color: 'text-blue-400' },
            { label: 'Quarantine Queue', value: monitor ? monitor.stats.hold_count + monitor.stats.failed_count : '--', sub: 'Awaiting validation', icon: ShieldAlert, color: 'text-amber-400' },
            { label: 'Source Integrity', value: monitor?.stats.source_count ?? '--', sub: `Growth: ${monitor?.stats.growth_rate_per_day ?? 0}/day`, icon: Server, color: 'text-emerald-400' }
          ].map((stat) => (
            <div key={stat.label} className="relative group overflow-hidden rounded-2xl border border-white/5 p-5 bg-zinc-900/40 backdrop-blur-sm transition-all hover:border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">{stat.label}</p>
                  <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                  <p className="text-[11px] text-zinc-500 font-medium mt-1">{stat.sub}</p>
                </div>
                <stat.icon size={20} className={`${stat.color} opacity-80 group-hover:scale-110 transition-transform`} />
              </div>
            </div>
          ))}
        </section>

        {/* Intelligence Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Ingestion Matrix</h3>
              </div>
              <div className="flex gap-2">
                <input className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs focus:border-cyan-500/50 transition-colors" placeholder="Filter status..." value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
                <input className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs focus:border-cyan-500/50 transition-colors" placeholder="Filter source..." value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
              </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-3">
              {packets.map((packet) => (
                <button
                  type="button"
                  key={packet.id}
                  onClick={() => setSelectedPacket(packet)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedPacket?.id === packet.id ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${packet.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {packet.status}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">{new Date(packet.ingestion_time).toLocaleTimeString()}</span>
                  </div>
                  <h4 className="text-sm font-bold tracking-tight mb-1 uppercase">{packet.type}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="font-medium text-zinc-300">{packet.source}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span>Attempts: {packet.retry_count ?? 0}</span>
                  </div>
                </button>
              ))}
              {!packets.length && (
                <div className="h-40 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-white/5 rounded-2xl">
                  <Database size={24} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">No Packets Detected</p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-5">Storage Topology</h3>
              <div className="space-y-4">
                {thresholds.map((row) => (
                  <div key={row.threshold} className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-zinc-500 uppercase tracking-tighter">Capacity Threshold {row.threshold}%</span>
                      <span className={row.hit ? 'text-amber-400' : 'text-zinc-700'}>{row.hit ? 'TRIGGERED' : 'READY'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${row.hit ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-zinc-800'}`} 
                        style={{ width: row.hit ? '100%' : '0%' }} 
                      />
                    </div>
                  </div>
                ))}

                {monitor?.storage.ingestion_blocked && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 animate-pulse">
                    <ShieldAlert size={18} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest leading-none">Ingestion Hard Lock</p>
                      <p className="text-[10px] font-medium opacity-70 mt-1">Storage limit exceeded. Actions restricted.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-6 overflow-hidden">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-5">Packet Diagnostics</h3>
              {selectedPacket ? (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Integrity</p>
                      <p className="text-[11px] font-mono uppercase text-emerald-400">{selectedPacket.status}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Source Access</p>
                      <p className="text-[11px] font-mono uppercase">{selectedPacket.source}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Payload Matrix</p>
                    <pre className="max-h-60 overflow-auto p-4 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono text-zinc-300 custom-scrollbar leading-relaxed">
                      {JSON.stringify(selectedPacket.content, null, 2)}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={() => runAction('delete', selectedPacket.id)} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 uppercase hover:bg-red-500/20 transition-colors">Terminate</button>
                    <button onClick={() => replayPacket(selectedPacket.id)} className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase hover:bg-cyan-500/20 transition-colors">Replay Matrix</button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-white/5 rounded-2xl">
                  <Activity size={20} className="mb-2 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Select Packet</p>
                </div>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
