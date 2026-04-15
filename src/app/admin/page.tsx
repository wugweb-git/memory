"use client";

import { useEffect, useMemo, useState } from 'react';

type Packet = {
  _id: string;
  type: string;
  priority: string;
  source?: { source_id?: string; source_type?: string };
  governance?: { ingestion_state?: string; hold_reason?: string; ingestion_path?: string };
  timestamps?: { event_at?: string; ingested_at?: string };
  storage?: { hash?: string };
  raw_content?: string;
  normalized_content?: { content?: string };
  content?: string;
  retries?: Array<{ at: string; reason: string }>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

type ManagePayload = {
  global_system_bar: Record<string, unknown>;
  system_overview: Record<string, unknown>;
  storage_manager: Record<string, unknown>;
  data_explorer: { packets: Packet[]; total: number };
  ingestion_monitor: { incoming_recent: Array<Record<string, unknown>>; failures: number; retries_total: number };
  source_trust_panel: Array<Record<string, unknown>>;
  documents_manager: { groups: Record<string, Packet[]>; secure_storage_indicator: boolean };
  import_panel: { last_import: Record<string, unknown> | null };
  export_panel: { last_export: Record<string, unknown> | null };
  review_queue: { hold_items: Packet[]; failed_items: Packet[]; correction_queue: Packet[] };
  processing_monitor: Record<string, unknown>;
  end_to_end_trace_view: Array<Record<string, unknown>>;
};

const EMPTY: ManagePayload = {
  global_system_bar: {},
  system_overview: {},
  storage_manager: {},
  data_explorer: { packets: [], total: 0 },
  ingestion_monitor: { incoming_recent: [], failures: 0, retries_total: 0 },
  source_trust_panel: [],
  documents_manager: { groups: { certificates: [], medical: [], tax: [] }, secure_storage_indicator: true },
  import_panel: { last_import: null },
  export_panel: { last_export: null },
  review_queue: { hold_items: [], failed_items: [], correction_queue: [] },
  processing_monitor: {},
  end_to_end_trace_view: []
};

export default function AdminControlSurface() {
  const [payload, setPayload] = useState<ManagePayload>(EMPTY);
  const [activePacket, setActivePacket] = useState<Packet | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [filter, setFilter] = useState({ type: '', source: '', priority: '', state: '', time: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    fetch(`/api/memory/manage?${qs.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json();
      })
      .then((data: ManagePayload) => {
        setPayload(data);
        setActivePacket(data.data_explorer.packets[0] || null);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [filter]);

  const packets = payload.data_explorer.packets;
  const selected = activePacket || packets[0] || null;

  const formattedGlobal = useMemo(() => {
    const g = payload.global_system_bar as any;
    return [
      ['Storage Used', g.total_storage_used_bytes],
      ['Remaining', g.remaining_storage_bytes],
      ['Ingestion Rate', g.ingestion_rate_recent],
      ['Queue', g.processing_queue_status],
      ['Active Sources', g.active_sources_count],
      ['Status', g.system_status]
    ];
  }, [payload.global_system_bar]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Memory Control Surface</h1>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {formattedGlobal.map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-zinc-800 p-3 bg-zinc-900/70">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="text-sm font-semibold break-words">{String(value ?? 'n/a')}</p>
          </div>
        ))}
      </section>

      {error && <div className="border border-red-800 bg-red-950/60 p-3 rounded">API error: {error}</div>}

      <section className="grid lg:grid-cols-2 gap-4">
        <Panel title="System Overview"><pre>{JSON.stringify(payload.system_overview, null, 2)}</pre></Panel>
        <Panel title="Storage Manager"><pre>{JSON.stringify(payload.storage_manager, null, 2)}</pre></Panel>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Panel title="Ingestion Monitor"><pre>{JSON.stringify(payload.ingestion_monitor, null, 2)}</pre></Panel>
        <Panel title="Source Control Panel"><pre>{JSON.stringify(payload.source_trust_panel, null, 2)}</pre></Panel>
        <Panel title="Processing Monitor"><pre>{JSON.stringify(payload.processing_monitor, null, 2)}</pre></Panel>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <Panel title="Import / Upload Panel"><pre>{JSON.stringify(payload.import_panel, null, 2)}</pre></Panel>
        <Panel title="Export Panel"><pre>{JSON.stringify(payload.export_panel, null, 2)}</pre></Panel>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Panel title="Documents Manager"><pre>{JSON.stringify(payload.documents_manager, null, 2)}</pre></Panel>
        <Panel title="Review Queue"><pre>{JSON.stringify(payload.review_queue, null, 2)}</pre></Panel>
        <Panel title="End-to-End Trace (Blob → Memory → Processing → Signals)"><pre>{JSON.stringify(payload.end_to_end_trace_view.slice(0, 8), null, 2)}</pre></Panel>
      </section>

      <section className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/70 space-y-4">
        <h2 className="font-semibold">Unified Data Explorer</h2>
        <div className="grid md:grid-cols-5 gap-2">
          {['type', 'source', 'priority', 'state', 'time'].map((k) => (
            <input
              key={k}
              placeholder={k}
              className="bg-zinc-950 border border-zinc-700 rounded p-2 text-sm"
              onChange={(e) => setFilter((prev) => ({ ...prev, [k]: e.target.value }))}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-1" onClick={() => setViewMode('list')}>List</button>
          <button className="border rounded px-3 py-1" onClick={() => setViewMode('detail')}>Packet Detail</button>
        </div>
        {viewMode === 'list' ? (
          <div className="max-h-72 overflow-auto border border-zinc-800 rounded">
            {packets.map((packet) => (
              <button
                key={packet._id}
                className="w-full text-left border-b border-zinc-800 p-2 hover:bg-zinc-800/50"
                onClick={() => setActivePacket(packet)}
              >
                <strong>{packet._id}</strong> — {packet.type} / {packet.priority} / {packet.governance?.ingestion_state}
              </button>
            ))}
            {!packets.length && <div className="p-3 text-zinc-400">No packets.</div>}
          </div>
        ) : (
          <PacketInspector packet={selected} />
        )}
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/70">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-xs text-zinc-300 overflow-auto max-h-64">{children}</div>
    </div>
  );
}

function PacketInspector({ packet }: { packet: Packet | null }) {
  if (!packet) return <div className="text-zinc-400">Select a packet.</div>;
  return (
    <div className="grid md:grid-cols-2 gap-3 text-xs">
      <InspectorField label="Raw Content" value={packet.raw_content} />
      <InspectorField label="Normalized Content" value={packet.normalized_content?.content || packet.content} />
      <InspectorField label="Source" value={JSON.stringify(packet.source)} />
      <InspectorField label="Ingestion Path" value={packet.governance?.ingestion_path} />
      <InspectorField label="Event Timestamp" value={packet.timestamps?.event_at} />
      <InspectorField label="Ingestion Timestamp" value={packet.timestamps?.ingested_at} />
      <InspectorField label="Status" value={packet.governance?.ingestion_state} />
      <InspectorField label="Retry History" value={JSON.stringify(packet.retries || [])} />
      <InspectorField label="Hash / ID" value={`${packet.storage?.hash || 'n/a'} / ${packet._id}`} />
      <InspectorField label="Metadata" value={JSON.stringify(packet.metadata || {})} />
    </div>
  );
}

function InspectorField({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="border border-zinc-800 rounded p-2 bg-zinc-950/60">
      <p className="text-zinc-500">{label}</p>
      <p className="break-words">{String(value ?? 'n/a')}</p>
    </div>
  );
}
