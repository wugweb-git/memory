'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Eye, Hash, Tag } from 'lucide-react';
import PacketInspector from './PacketInspector';

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

interface MemoryExplorerProps {
  testRunId?: string;
}

const PAGE_SIZE = 10;

function formatDate(ts: string) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString();
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
      const response = await fetch(`/api/memory/list?limit=${PAGE_SIZE}&test_run_id=${encodeURIComponent(testRunId)}${filterType ? `&type=${encodeURIComponent(filterType)}` : ''}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setPackets(data.packets || []);
      setLoadError(null);
    } catch (err) {
      setPackets([]);
      setLoadError(err instanceof Error ? `Could not load packets: ${err.message}. Retry, or check that you are signed in as admin.` : 'Could not load packets. Retry, or check that you are signed in as admin.');
    } finally {
      setLoading(false);
    }
  }, [filterType, testRunId]);

  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  const headCell = 'px-4 sm:px-6 py-3 text-xs font-semibold text-text-tertiary';

  return (
    <section aria-labelledby="memory-explorer-title" className="bg-bg-elevated rounded-xl border border-border-secondary overflow-hidden relative">
      <div className="p-4 sm:p-6 border-b border-border-secondary flex flex-wrap items-center justify-between gap-3 bg-bg-secondary">
        <div>
          <h2 id="memory-explorer-title" className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Database aria-hidden="true" className="w-5 h-5 text-text-tertiary" />
            Memory data explorer
          </h2>
          <p className="text-sm text-text-tertiary mt-1">Latest stored memory packets with their processing status.</p>
        </div>
        <div>
          <label htmlFor="explorer-type-filter" className="sr-only">Filter by packet type</label>
          <select
            id="explorer-type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="min-h-11 bg-bg-primary border border-border-secondary rounded-md px-3 py-1.5 text-base sm:text-xs text-text-secondary"
          >
            <option value="">All types</option>
            <option value="email">Email</option>
            <option value="activity">Activity</option>
            <option value="document">Document</option>
            <option value="note">Note</option>
          </select>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="px-4 sm:px-6 pt-4 flex flex-wrap items-center gap-3 text-sm text-danger">
          <span>{loadError}</span>
          <button type="button" onClick={fetchPackets} className="min-h-11 px-3 rounded-lg border border-danger text-xs font-bold">Retry</button>
        </div>
      )}

      <div className="overflow-x-auto" role="region" aria-label="Memory packets table, scrollable" tabIndex={0} aria-busy={loading}>
        <table className="w-full text-left border-collapse min-w-[640px]">
          <caption className="sr-only">Latest {PAGE_SIZE} memory packets{filterType ? ` of type ${filterType}` : ''}</caption>
          <thead>
            <tr className="border-b border-border-secondary bg-bg-primary">
              <th scope="col" className={headCell}>Packet ID</th>
              <th scope="col" className={headCell}>Source</th>
              <th scope="col" className={headCell}>Type</th>
              <th scope="col" className={headCell}>Status</th>
              <th scope="col" className={headCell}>Embedding</th>
              <th scope="col" className={headCell}>Date</th>
              <th scope="col" className={headCell}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-sm text-text-tertiary" role="status">Loading packets…</td>
              </tr>
            ) : packets.length === 0 && !loadError ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-sm text-text-tertiary">
                  {filterType ? `No ${filterType} packets found. Choose another type.` : 'No packets stored yet. Capture something in the buffer to see it here.'}
                </td>
              </tr>
            ) : packets.map((packet) => (
              <tr key={packet.id} className="border-b border-border-secondary hover:bg-bg-secondary transition-colors">
                <td className="px-4 sm:px-6 py-3">
                  <div className="flex items-center gap-2">
                    <Hash aria-hidden="true" className="w-3 h-3 text-text-tertiary" />
                    <span className="text-xs font-mono text-text-secondary" title={packet.id}>
                      {packet.id.slice(-8)}
                    </span>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-3">
                  <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-primary text-2xs text-accent font-bold inline-block">
                    {packet.source}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Tag aria-hidden="true" className="w-3 h-3 text-text-tertiary" />
                    {packet.type}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-3">
                  <StatusBadge status={packet.status} />
                </td>
                <td className="px-4 sm:px-6 py-3">
                  <EmbedStatusBadge status={packet.embedding_status} />
                </td>
                <td className="px-4 sm:px-6 py-3 text-xs text-text-tertiary whitespace-nowrap">
                  {formatDate(packet.ingestion_time)}
                </td>
                <td className="px-4 sm:px-6 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedPacketId(packet.id)}
                    aria-label={`View details for packet ${packet.id.slice(-8)}`}
                    className="inline-flex items-center justify-center min-h-11 min-w-11 hover:bg-bg-tertiary rounded-md transition-colors text-text-tertiary hover:text-text-primary"
                  >
                    <Eye aria-hidden="true" className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-bg-primary border-t border-border-secondary text-xs text-text-tertiary">
        Showing the latest {PAGE_SIZE} records. Use the type filter to narrow the list.
      </div>

      {selectedPacketId && (
        <PacketInspector
          packetId={selectedPacketId}
          onClose={() => setSelectedPacketId(null)}
        />
      )}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-success',
  failed: 'text-danger',
  partial: 'text-warning',
  archived: 'text-text-tertiary',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded bg-bg-secondary text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.active}`}>
      {status}
    </span>
  );
}

const EMBED_STYLES: Record<string, string> = {
  embedded: 'text-accent',
  pending: 'text-warning',
  processing: 'text-text-secondary',
  failed: 'text-danger',
};

function EmbedStatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${status === 'embedded' ? 'bg-accent' : status === 'failed' ? 'bg-danger' : 'bg-border-primary'}`} />
      <span className={`text-xs font-semibold ${EMBED_STYLES[status] || 'text-text-tertiary'}`}>
        {status}
      </span>
    </div>
  );
}
