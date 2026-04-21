'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Filter, 
  HardDrive,
  Upload,
  X,
  FileJson,
  RefreshCw,
  Search,
  MoreVertical
} from 'lucide-react';
import ManualUpload from './components/ManualUpload';

interface BlobItem {
  id: string;
  type: string;
  source: string;
  size: number;
  state: string;
  created_at: string;
  raw_payload: any;
  trace_json: any;
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
  const [activeTab, setActiveTab] = useState<'all' | 'raw' | 'reviewed' | 'promoted'>('all');
  
  // Stats & Ingestion Monitoring
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/blob/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch blob stats', err);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const stateFilter = activeTab === 'all' ? '' : `&state=${activeTab}`;
      const res = await fetch(`/api/blob?limit=50${stateFilter}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch blob items', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchStats();
    fetchItems();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchItems]);

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/blob/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchItems();
        fetchStats();
      }
    } catch (err) {
      console.error(`Failed to ${action} blob item`, err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-orange-500';
      case 'blocked': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'raw': return 'bg-slate-200 text-slate-700';
      case 'reviewed': return 'bg-blue-100 text-blue-700';
      case 'promotable': return 'bg-indigo-100 text-indigo-700';
      case 'promoted': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-rose-100 text-rose-700';
      case 'expired': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* 🔹 STORAGE STATUS STRIP */}
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full animate-pulse ${stats ? getStatusColor(stats.status) : 'bg-slate-500'}`} />
            <h1 className="text-sm font-medium tracking-tight uppercase text-white/90">Buffer Control Surface</h1>
            <span className="h-4 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-2 text-xs text-white/50">
              <HardDrive size={14} />
              <span>{stats ? `${stats.usage_percent}% capacity` : 'Loading...'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${stats ? getStatusColor(stats.status) : 'bg-slate-500'}`}
                style={{ width: `${stats?.usage_percent || 0}%` }}
              />
            </div>
            <button 
              onClick={() => { fetchItems(); fetchStats(); }}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 🔹 LEFT PANEL: FILTERS & TOOLS */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
              <h2 className="text-xs font-semibold uppercase text-white/30 tracking-widest">Filter Items</h2>
              <div className="space-y-1">
                {(['all', 'raw', 'reviewed', 'promoted'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      activeTab === tab ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'
                    }`}
                  >
                    <span className="capitalize">{tab}</span>
                    <ChevronRight size={14} className={activeTab === tab ? 'opacity-100' : 'opacity-0'} />
                  </button>
                ))}
              </div>
            </div>

              <ManualUpload onComplete={() => fetchItems()} />
          </div>

          {/* 🔹 CENTER PANEL: BLOB FEED */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="text" 
                    placeholder="Search by ID or Source..." 
                    className="bg-white/5 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50 w-64 lg:w-80 transition-all shadow-xl shadow-black/20"
                  />
                </div>
              </div>
              <div className="text-xs text-white/30">
                Displaying <span className="text-white/60 font-medium">{items.length}</span> nodes
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/40">
                    <th className="px-6 py-4 font-medium">Node ID</th>
                    <th className="px-6 py-4 font-medium">Origin</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Size</th>
                    <th className="px-6 py-4 font-medium">State</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-8 bg-white/[0.01]" />
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-white/20">
                         <div className="flex flex-col items-center gap-3">
                           <Database size={32} />
                           <p>No nodes detected in current quarantine.</p>
                         </div>
                      </td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                        className={`hover:bg-white/[0.03] transition-colors cursor-pointer group ${selectedId === item.id ? 'bg-indigo-500/10' : ''}`}
                      >
                        <td className="px-6 py-4 font-mono text-[10px] text-white/60">
                           {item.id.substring(0, 18)}...
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded bg-white/5 text-[10px] text-white/80">{item.source}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-white/50 uppercase tracking-tighter italic">{item.type}</td>
                        <td className="px-6 py-4 text-xs tabular-nums text-white/40">{formatSize(item.size)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStateColor(item.state)}`}>
                            {item.state}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-white/30">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 hover:bg-white/10 rounded text-white/20 hover:text-white transition-all">
                             <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 🔹 ITEM VIEWER / ACTIONS DRAWER */}
            {selectedId && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-white font-medium">Node Analysis</h3>
                    <p className="text-xs text-white/30">{selectedId}</p>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">Actions</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                         onClick={() => handleAction(selectedId, 'review')}
                         className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-sm font-medium"
                      >
                         <CheckCircle2 size={16} /> Mark Reviewed
                      </button>
                      <button 
                         onClick={() => handleAction(selectedId, 'promotable')}
                         className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all text-sm font-medium"
                      >
                         <ChevronRight size={16} /> Mark Promotable
                      </button>
                      <button 
                         onClick={() => handleAction(selectedId, 'promote')}
                         className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-medium col-span-2"
                      >
                         < RefreshCw size={16} /> PROMOTE TO MEMORY
                      </button>
                      <button 
                         onClick={() => handleAction(selectedId, 'reject')}
                         className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all text-sm font-medium col-span-2"
                      >
                         <Trash2 size={16} /> Reject & Purge
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">Payload Data</h4>
                    <div className="bg-black/40 rounded-xl p-4 font-mono text-[11px] overflow-auto max-h-64 scrollbar-thin scrollbar-thumb-white/10">
                       <pre className="text-emerald-400/80">
                         {JSON.stringify(items.find(i => i.id === selectedId)?.raw_payload, null, 2)}
                       </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 🔹 STORAGE ALERT STRIP */}
      {stats && stats.status !== 'healthy' && (
        <div className={`fixed bottom-0 left-0 right-0 py-3 px-6 flex items-center justify-center gap-3 animate-bounce ${
          stats.status === 'blocked' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-black'
        }`}>
          <AlertTriangle size={18} />
          <span className="text-sm font-bold uppercase tracking-widest">
            {stats.status === 'blocked' ? 'CRITICAL: INGESTION BLOCKED BY CAPACITY' : 'WARNING: SYSTEM BUFFER AT HIGH CAPACITY'}
          </span>
        </div>
      )}
    </div>
  );
}
