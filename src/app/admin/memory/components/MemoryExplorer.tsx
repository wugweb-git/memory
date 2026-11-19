'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { Database, Eye, Hash, Tag } from 'lucide-react';

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

  const [loadError, setLoadError] = useState<string | null>(null);
  const fetchPackets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/memory/list?limit=10&test_run_id=${encodeURIComponent(testRunId)}${filterType ? `&type=${encodeURIComponent(filterType)}` : ''}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setPackets(data.packets || []);
      setLoadError(null);
    } catch (err) {
      setPackets([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to fetch packets');
    } finally {
      setLoading(false);
    }
  }, [filterType, testRunId]);

  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  const openPacket = (id: string) => setSelectedPacketId(id);

  return (
    <section aria-label="Memory data explorer" className="relative overflow-hidden rounded-2xl border border-border-primary bg-bg-elevated">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-secondary bg-bg-secondary p-4 sm:p-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-text-primary">
            <Database aria-hidden="true" className="h-5 w-5 text-text-tertiary" />
            Memory explorer
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">Browse the latest memory packets and open one to inspect it.</p>
        </div>
        <label className="block w-full sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-text-secondary">Packet type</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border-primary bg-bg-primary px-3 text-sm text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-44"
          >
            <option value="">All types</option>
            <option value="email">Email</option>
            <option value="activity">Activity</option>
            <option value="document">Document</option>
            <option value="note">Note</option>
          </select>
        </label>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-danger/20 bg-danger/5 px-4 py-3 sm:px-6">
          <p className="text-sm text-danger">Could not load packets: {loadError}</p>
          <button type="button" onClick={fetchPackets} className="min-h-11 rounded-xl border border-danger/40 px-4 text-xs font-bold text-danger hover:bg-danger/5">
            Try again
          </button>
        </div>
      )}

      {/* Phones: one card per packet, type first */}
      <div className="space-y-3 p-4 md:hidden" aria-busy={loading}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : packets.length === 0 && !loadError ? (
          <EmptyState
            title={filterType ? `No ${filterType} packets` : 'No packets yet'}
            hint={filterType ? 'Try another packet type.' : 'Ingest something from the buffer and it appears here.'}
          />
        ) : (
          packets.map((packet) => (
            <button
              key={packet.id}
              type="button"
              onClick={() => openPacket(packet.id)}
              aria-label={`Inspect ${packet.type} packet from ${packet.source}`}
              className="block min-h-11 w-full rounded-xl border border-border-secondary bg-bg-primary p-4 text-left transition-colors hover:border-border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-text-primary">
                  <Tag aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <span className="truncate">{packet.type}</span>
                </div>
                <StatusBadge status={packet.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                <span className="font-medium text-text-secondary">{packet.source}</span>
                <EmbedStatusBadge status={packet.embedding_status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-2xs text-text-tertiary">
                <span className="flex items-center gap-1 font-mono"><Hash aria-hidden="true" className="h-3 w-3" />{packet.id.slice(-8)}</span>
                <span>{new Date(packet.ingestion_time).toLocaleDateString()}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Tablet and up: table */}
      <div className="hidden overflow-x-auto md:block" aria-busy={loading}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Latest memory packets</caption>
          <thead>
            <tr className="border-b border-border-secondary bg-bg-primary text-xs text-text-tertiary">
              <th scope="col" className="px-6 py-3 font-medium">Type</th>
              <th scope="col" className="px-6 py-3 font-medium">Source</th>
              <th scope="col" className="px-6 py-3 font-medium">Status</th>
              <th scope="col" className="px-6 py-3 font-medium">Embedding</th>
              <th scope="col" className="px-6 py-3 font-medium">Added</th>
              <th scope="col" className="px-6 py-3 font-medium">Packet ID</th>
              <th scope="col" className="px-6 py-3"><span className="sr-only">Inspect</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-secondary">
                  <td colSpan={7} className="px-6 py-3"><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))
            ) : packets.length === 0 && !loadError ? (
              <tr>
                <td colSpan={7} className="p-6">
                  <EmptyState
                    title={filterType ? `No ${filterType} packets` : 'No packets yet'}
                    hint={filterType ? 'Try another packet type.' : 'Ingest something from the buffer and it appears here.'}
                  />
                </td>
              </tr>
            ) : packets.map((packet) => (
              <tr key={packet.id} className="group border-b border-border-secondary transition-colors hover:bg-bg-secondary">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <Tag aria-hidden="true" className="h-3 w-3 text-text-tertiary" />
                    {packet.type}
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-text-secondary">{packet.source}</td>
                <td className="px-6 py-3"><StatusBadge status={packet.status} /></td>
                <td className="px-6 py-3"><EmbedStatusBadge status={packet.embedding_status} /></td>
                <td className="px-6 py-3 text-xs text-text-tertiary">{new Date(packet.ingestion_time).toLocaleDateString()}</td>
                <td className="px-6 py-3">
                  <span className="flex items-center gap-1 font-mono text-xs text-text-tertiary">
                    <Hash aria-hidden="true" className="h-3 w-3" />{packet.id.slice(-8)}
                  </span>
                </td>
                <td className="px-6 py-1 text-right">
                  <button
                    type="button"
                    aria-label={`Inspect ${packet.type} packet from ${packet.source}`}
                    onClick={() => openPacket(packet.id)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-primary hover:text-text-primary"
                  >
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p role="status" className="border-t border-border-secondary bg-bg-primary/50 px-4 py-3 text-xs text-text-tertiary sm:px-6">
        {loading ? 'Loading packets…' : `Showing the latest ${packets.length} ${packets.length === 1 ? 'packet' : 'packets'}.`}
      </p>

      {/* INSPECTOR OVERLAY */}
      {selectedPacketId && (
        <PacketInspector
          packetId={selectedPacketId}
          onClose={() => setSelectedPacketId(null)}
        />
      )}
    </section>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    active: 'text-success bg-bg-secondary',
    failed: 'text-danger bg-bg-secondary',
    partial: 'text-warning bg-bg-secondary',
    archived: 'text-text-tertiary bg-secondary'
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-2xs font-bold ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

function EmbedStatusBadge({ status }: any) {
  const styles: any = {
    embedded: 'text-accent bg-bg-secondary',
    pending: 'text-warning bg-bg-secondary',
    processing: 'text-accent bg-accent/10',
    failed: 'text-danger bg-bg-secondary'
  };
  return (
    <div className="flex items-center gap-2">
      <div aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${status === 'embedded' ? 'bg-accent' : 'bg-bg-tertiary'} shadow-sm`} />
      <span className={`text-2xs font-bold ${styles[status] || 'text-text-tertiary'}`}>
        {status}
      </span>
    </div>
  );
}
