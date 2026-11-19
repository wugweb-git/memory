'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SignalTimeline } from './SignalTimeline';
import { SemanticPanel } from './SemanticPanel';
import { IntelPanel } from './IntelPanel';
import { X, FileText, Database, Code, Activity } from 'lucide-react';

interface PacketInspectorProps {
  packetId: string;
  onClose: () => void;
}

type TabKey = 'content' | 'metadata' | 'trace';
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'content', label: 'Content' },
  { key: 'metadata', label: 'Metadata' },
  { key: 'trace', label: 'Trace' },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PacketInspector({ packetId, onClose }: PacketInspectorProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const id = encodeURIComponent(packetId);
      const [packetRes, signalsRes, semanticRes] = await Promise.all([
        fetch(`/api/memory/get?id=${id}`, { credentials: 'include' }),
        fetch(`/api/processing/signals?packetId=${id}`, { credentials: 'include' }),
        fetch(`/api/processing/semantic?packetId=${id}`, { credentials: 'include' }),
      ]);

      if (!packetRes.ok) {
        const body = await packetRes.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${packetRes.status}`);
      }
      const packetData = await packetRes.json();
      // Signals and semantic data are optional enrichments: a failure there must not hide the packet.
      const signalsData = signalsRes.ok ? await signalsRes.json().catch(() => ({})) : {};
      const semanticData = semanticRes.ok ? await semanticRes.json().catch(() => ({})) : {};

      setData({
        packet: packetData.packet,
        signals: signalsData.signals,
        semantic: semanticData.semantic,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [packetId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Focus management: move focus in, restore on close, trap Tab, close on Escape, lock page scroll.
  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const key = TABS[next].key;
      setActiveTab(key);
      tabRefs.current[key]?.focus();
    }
  }

  if (!packetId) return null;

  const signals: any[] = Array.isArray(data?.signals) ? data.signals : [];
  const avgIntensity = signals.length > 0
    ? signals.reduce((acc: number, s: any) => acc + (Number(s.intensity_absolute) || 0), 0) / signals.length
    : 0;
  const panelValue = data?.packet?.[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-bg-primary/80 backdrop-blur-md sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="packet-inspector-title"
        className="w-full max-w-6xl h-full bg-bg-elevated border-l border-border-secondary flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 motion-reduce:animate-none"
      >
        <div className="p-4 sm:p-6 border-b border-border-secondary flex items-center justify-between gap-3 bg-bg-secondary">
          <div className="flex items-center gap-4 min-w-0">
            <div aria-hidden="true" className="p-3 bg-bg-secondary rounded-xl border border-border-primary hidden sm:block">
              <Activity className="w-6 h-6 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 id="packet-inspector-title" className="text-base font-semibold text-text-primary">Packet details</h2>
              <p className="text-xs text-text-tertiary font-mono mt-1 break-all">ID: {packetId}</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close packet details"
            className="inline-flex items-center justify-center min-h-11 min-w-11 hover:bg-bg-tertiary rounded-full transition-colors text-text-tertiary hover:text-text-primary shrink-0"
          >
            <X aria-hidden="true" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-bg-primary" aria-busy={loading}>
          {error ? (
            <div role="alert" className="rounded-xl border border-danger p-4 text-sm text-danger flex flex-wrap items-center justify-between gap-3">
              <span>Could not load this packet: {error}. It may have been deleted. Retry, or close and refresh the list.</span>
              <button type="button" onClick={fetchDetails} className="min-h-11 px-4 rounded-lg border border-danger text-xs font-bold">Retry</button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6 lg:gap-10">
              <div className="col-span-12 min-w-0 lg:col-span-5 space-y-4">
                <div role="tablist" aria-label="Packet data" className="flex items-center gap-1 p-1 bg-bg-primary rounded-lg border border-border-secondary">
                  {TABS.map((tab, i) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      id={`packet-tab-${tab.key}`}
                      aria-selected={activeTab === tab.key}
                      aria-controls="packet-tabpanel"
                      tabIndex={activeTab === tab.key ? 0 : -1}
                      ref={(el) => { tabRefs.current[tab.key] = el; }}
                      onClick={() => setActiveTab(tab.key)}
                      onKeyDown={(e) => onTabKeyDown(e, i)}
                      className={`flex-1 min-h-11 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                        activeTab === tab.key
                          ? 'bg-bg-secondary text-text-primary border border-border-primary'
                          : 'text-text-tertiary hover:text-text-secondary border border-transparent'
                      }`}
                    >
                      {tab.key === 'content' && <FileText aria-hidden="true" className="w-3.5 h-3.5" />}
                      {tab.key === 'metadata' && <Database aria-hidden="true" className="w-3.5 h-3.5" />}
                      {tab.key === 'trace' && <Code aria-hidden="true" className="w-3.5 h-3.5" />}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div
                  role="tabpanel"
                  id="packet-tabpanel"
                  aria-labelledby={`packet-tab-${activeTab}`}
                  tabIndex={0}
                  className="bg-bg-secondary rounded-2xl border border-border-secondary p-4 sm:p-6 font-mono text-xs overflow-x-auto min-h-[240px] lg:min-h-[500px]"
                >
                  {loading ? (
                    <p role="status" className="text-text-tertiary">Loading packet…</p>
                  ) : panelValue === undefined || panelValue === null ? (
                    <p className="text-text-tertiary">This packet has no {activeTab} data.</p>
                  ) : (
                    <pre className="text-text-secondary whitespace-pre-wrap break-words leading-relaxed">
                      {JSON.stringify(panelValue, null, 2)}
                    </pre>
                  )}
                </div>
                <p className="text-xs text-text-tertiary">Read-only view of the stored packet.</p>
              </div>

              <div className="col-span-12 min-w-0 lg:col-span-7 space-y-10">
                <section aria-labelledby="packet-l2-title" className="space-y-5">
                  <h3 id="packet-l2-title" className="text-sm font-semibold text-text-secondary flex items-center gap-3">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent" />
                    Signals (layer 2)
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    <SignalTimeline signals={signals} loading={loading} />
                    <IntelPanel
                      loading={loading}
                      metrics={signals.length > 0 ? {
                        total_signals: signals.length,
                        avg_intensity: avgIntensity,
                      } : null}
                    />
                  </div>
                </section>

                <section aria-labelledby="packet-l25-title" className="space-y-5">
                  <h3 id="packet-l25-title" className="text-sm font-semibold text-text-secondary flex items-center gap-3">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent" />
                    Semantic enrichment (layer 2.5)
                  </h3>
                  <SemanticPanel data={data?.semantic ?? null} loading={loading} />
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
