'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Database, Filter, Eye, ChevronLeft, ChevronRight, Hash, Shield, Tag } from 'lucide-react';

interface Packet {
  id: string;
  type: string;
  source: string;
  status: string;
  embedding_status: string;
  ingestion_time: string;
  content: any;
  sensitivity: string;
}

import PacketInspector from './PacketInspector';

interface MemoryExplorerProps {
  testRunId?: string;
}

export default function MemoryExplorer({ testRunId = 'PROD' }: MemoryExplorerProps) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);

  const fetchPackets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/memory/list?limit=10&test_run_id=${testRunId}${filterType ? `&type=${filterType}` : ''}`);
      const data = await response.json();
      setPackets(data.packets || []);
    } catch (err) {
      console.error('Failed to fetch packets');
    } finally {
      setLoading(false);
    }
  }, [filterType, testRunId]);

  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden relative">
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" />
            Memory Data Explorer
          </h2>
          <p className="text-sm text-gray-500 mt-1">Direct access to the NoSQL memory packets.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-black border border-white/10 rounded-md px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="">All Types</option>
            <option value="email">Email</option>
            <option value="activity">Activity</option>
            <option value="document">Document</option>
            <option value="note">Note</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-black">
              <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest">Packet ID</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest">Source</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest">Embed Status</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest">Time</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-white/5">
                  <td colSpan={7} className="px-6 py-8 h-4 bg-white/5 opacity-20"></td>
                </tr>
              ))
            ) : packets.map((packet) => (
              <tr key={packet.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-mono text-gray-400 group-hover:text-white transition-colors">
                      {packet.id.slice(-8)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-bold inline-block uppercase tracking-tight">
                    {packet.source}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <Tag className="w-3 h-3 text-gray-600" />
                    {packet.type}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={packet.status} />
                </td>
                <td className="px-6 py-4">
                  <EmbedStatusBadge status={packet.embedding_status} />
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {new Date(packet.ingestion_time).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedPacketId(packet.id)}
                    className="p-2 hover:bg-white/10 rounded-md transition-all text-gray-600 hover:text-white"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-black/50 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-600 font-bold tracking-widest uppercase">
        <div className="flex items-center gap-4">
          <span>Showing 10 records</span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" /> Encrypted Vault active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:text-white transition-all"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-white px-2">Page 1</span>
          <button className="p-1 hover:text-white transition-all"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* INSPECTOR OVERLAY */}
      {selectedPacketId && (
        <PacketInspector 
          packetId={selectedPacketId} 
          onClose={() => setSelectedPacketId(null)} 
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    active: 'text-emerald-400 bg-emerald-500/10',
    failed: 'text-red-400 bg-red-500/10',
    partial: 'text-amber-400 bg-amber-500/10',
    archived: 'text-gray-400 bg-white/10'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

function EmbedStatusBadge({ status }: any) {
  const styles: any = {
    embedded: 'text-blue-400 bg-blue-500/10',
    pending: 'text-amber-400 bg-amber-500/10',
    processing: 'text-violet-400 bg-violet-500/10',
    failed: 'text-red-400 bg-red-500/10'
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'embedded' ? 'bg-blue-400' : 'bg-gray-600'} shadow-[0_0_5px_rgba(96,165,250,0.5)]`} />
      <span className={`text-[9px] font-bold uppercase tracking-wider ${styles[status] || 'text-gray-500'}`}>
        {status}
      </span>
    </div>
  );
}
