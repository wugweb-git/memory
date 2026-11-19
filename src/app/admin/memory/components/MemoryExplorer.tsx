'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Database, Eye, Hash, Tag } from 'lucide-react';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import PacketInspector from './PacketInspector';
import { pageRangeLabel, hasPrevPage, hasNextPage } from '@/lib/memory/list-pagination';

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
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Back to page 1 whenever the filter or test run changes.
  useEffect(() => {
    setOffset(0);
  }, [filterType, testRunId]);

  const fetchPackets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/memory/list?limit=${PAGE_SIZE}&offset=${offset}&test_run_id=${encodeURIComponent(testRunId)}${filterType ? `&type=${encodeURIComponent(filterType)}` : ''}`, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      const items: Packet[] = data.packets || [];
      const count = typeof data.total === 'number' ? data.total : items.length;
      // Page vanished (e.g. records removed): step back to the last page that exists.
      if (items.length === 0 && count > 0 && offset > 0) {
        setOffset(Math.max(0, Math.floor((count - 1) / PAGE_SIZE) * PAGE_SIZE));
        return;
      }
      setPackets(items);
      setTotal(count);
      setLoadError(null);
    } catch (err) {
      setPackets([]);
      setTotal(0);
      setLoadError(err instanceof Error ? `Could not load packets: ${err.message}. Retry, or check that you are signed in as admin.` : 'Could not load packets. Retry, or check that you are signed in as admin.');
    } finally {
      setLoading(false);
    }
  }, [filterType, testRunId, offset]);

  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  const canPrev = hasPrevPage(offset);
  const canNext = hasNextPage(offset, packets.length, total);
  const rangeLabel = pageRangeLabel(offset, packets.length, total);

  const goPrev = () => {
    if (!canPrev || loading) return;
    setOffset(Math.max(0, offset - PAGE_SIZE));
  };
  const goNext = () => {
    if (!canNext || loading) return;
    setOffset(offset + PAGE_SIZE);
  };

  const openPacket = (id: string) => setSelectedPacketId(id);

  const headCell = 'px-6 py-3 font-medium';
  const emptyTitle = filterType ? `No ${filterType} packets` : 'No packets yet';
  const emptyHint = filterType ? 'Try another packet type.' : 'Ingest something from the buffer and it appears here.';

  return (
    <section aria-labelledby="memory-explorer-title" className="relative overflow-hidden rounded-2xl border border-border-primary bg-bg-elevated">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-secondary bg-bg-secondary p-4 sm:p-6">
        <div className="min-w-0">
          <h2 id="memory-explorer-title" ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-base font-semibold text-text-primary focus:outline-none">
            <Database aria-hidden="true" className="h-5 w-5 text-text-tertiary" />
            Memory explorer
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">Browse memory packets, newest first, and open one to inspect it.</p>
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="explorer-type-filter" className="mb-1 block text-sm font-medium text-text-secondary">Packet type</label>
          <select
            id="explorer-type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border-primary bg-bg-primary px-3 text-base text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-44 sm:text-sm"
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
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-danger/20 bg-danger/5 px-4 py-3 sm:px-6">
          <p className="text-sm text-danger">{loadError}</p>
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
          <EmptyState title={emptyTitle} hint={emptyHint} />
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
              <div className="mt-2 flex items-center justify-between text-xs text-text-tertiary">
                <span className="flex items-center gap-1 font-mono"><Hash aria-hidden="true" className="h-3 w-3" />{packet.id.slice(-8)}</span>
                <span>{formatDate(packet.ingestion_time)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Tablet and up: table */}
      <div className="hidden overflow-x-auto md:block" role="region" aria-label="Memory packets table, scrollable" tabIndex={0} aria-busy={loading}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Memory packets{filterType ? ` of type ${filterType}` : ''}, {rangeLabel}</caption>
          <thead>
            <tr className="border-b border-border-secondary bg-bg-primary text-xs text-text-tertiary">
              <th scope="col" className={headCell}>Type</th>
              <th scope="col" className={headCell}>Source</th>
              <th scope="col" className={headCell}>Status</th>
              <th scope="col" className={headCell}>Embedding</th>
              <th scope="col" className={headCell}>Added</th>
              <th scope="col" className={headCell}>Packet ID</th>
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
                  <EmptyState title={emptyTitle} hint={emptyHint} />
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
                <td className="whitespace-nowrap px-6 py-3 text-xs text-text-tertiary">{formatDate(packet.ingestion_time)}</td>
                <td className="px-6 py-3">
                  <span className="flex items-center gap-1 font-mono text-xs text-text-tertiary" title={packet.id}>
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-secondary bg-bg-primary px-4 py-3 sm:px-6">
        <p className="text-sm text-text-tertiary">
          {loading ? 'Loading packets…' : rangeLabel}
        </p>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={goPrev}
            aria-disabled={!canPrev || loading}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-none ${!canPrev || loading ? 'cursor-not-allowed opacity-50' : 'hover:bg-bg-secondary'}`}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-disabled={!canNext || loading}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-border-primary px-4 text-sm font-medium text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-none ${!canNext || loading ? 'cursor-not-allowed opacity-50' : 'hover:bg-bg-secondary'}`}
          >
            Next
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {loading ? '' : rangeLabel}
      </p>

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
    <span className={`rounded-full bg-bg-secondary px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] || STATUS_STYLES.active}`}>
      {status}
    </span>
  );
}

const EMBED_STYLES: Record<string, string> = {
  embedded: 'text-accent-ink',
  pending: 'text-warning',
  processing: 'text-text-secondary',
  failed: 'text-danger',
};

function EmbedStatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status === 'embedded' ? 'bg-accent' : status === 'failed' ? 'bg-danger' : 'bg-border-primary'}`} />
      <span className={`text-xs font-bold ${EMBED_STYLES[status] || 'text-text-tertiary'}`}>
        {status}
      </span>
    </div>
  );
}
