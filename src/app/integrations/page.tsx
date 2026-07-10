'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { M3Card, M3Page, M3State } from '@/components/ui/m3';
import { AppShell } from '@/app/component/AppShell';
import { apiRequest } from '@/lib/ui/api-client';

type ConnectorStatus = {
  id: string;
  label: string;
  category: string;
  kind: 'rss' | 'api' | 'oauth' | 'manual' | 'device';
  requires: 'none' | 'env' | 'oauth';
  cadenceMins: number;
  setupHint: string;
  configured: boolean;
  connected?: boolean;
  authStartPath?: string;
  lastSyncAt: string | null;
  lastError: string | null;
  lastResult: { ingested: number; skipped: number; scanned?: number } | null;
};

function relTime(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (Number.isNaN(mins)) return 'never';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** OAuth connectors need consent (connected) on top of configured (creds set). */
function isReady(c: ConnectorStatus): boolean {
  return c.configured && (c.connected ?? true);
}

function StatusDot({ c }: { c: ConnectorStatus }) {
  const [color, label] = c.lastError
    ? ['bg-danger', 'Error']
    : !c.configured
      ? ['bg-text-disabled', c.kind === 'manual' ? 'Manual' : 'Needs setup']
      : !isReady(c)
        ? ['bg-warning', 'Connect']
        : c.lastSyncAt
          ? ['bg-success', 'Synced']
          : ['bg-warning', 'Ready'];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-2xs text-text-tertiary">{label}</span>
    </span>
  );
}

const KIND_GROUPS: Array<{ key: string; title: string; subtitle: string; match: (c: ConnectorStatus) => boolean }> = [
  { key: 'auto', title: 'Auto-sync sources', subtitle: 'Fetched on a schedule — sync now anytime', match: (c) => c.kind === 'rss' || c.kind === 'api' || (c.kind === 'oauth' && c.configured) },
  { key: 'manual', title: 'Manual capture', subtitle: 'Captured from the Buffer surface', match: (c) => c.kind === 'manual' },
  { key: 'oauth', title: 'Needs credentials', subtitle: 'Go live the moment their keys exist — no fake sync', match: (c) => (c.kind === 'oauth' && !c.configured) || c.kind === 'device' },
];

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<{ connectors: ConnectorStatus[] }>('/api/sources');
      setConnectors(data.connectors ?? []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Surface the result of an OAuth round-trip (?google=connected|denied|error).
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('google');
    if (!status) return;
    const messages: Record<string, [string, 'ok' | 'err']> = {
      connected: ['Google connected — sources can sync now.', 'ok'],
      denied: ['Google connection was denied.', 'err'],
      error: ['Google connection failed — check the OAuth app config.', 'err'],
      badstate: ['Google connection expired — try again.', 'err'],
      nocode: ['Google returned no authorization code.', 'err'],
    };
    const [msg, tone] = messages[status] ?? [`Google: ${status}`, 'err'];
    if (tone === 'ok') toast.success(msg);
    else toast.error(msg);
    window.history.replaceState({}, '', '/integrations');
  }, []);

  async function syncNow(c: ConnectorStatus) {
    setSyncing(c.id);
    try {
      const res = await apiRequest<{ ingested: number; skipped: number }>(`/api/sources/${c.id}/sync`, {
        method: 'POST',
        body: {},
        timeoutMs: 30_000,
      });
      toast.success(`${c.label}: ${res.ingested} new, ${res.skipped} skipped`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Sync failed for ${c.label}`);
    } finally {
      setSyncing(null);
    }
  }

  return (
    <AppShell>
      <ToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Integrations" subtitle="Every source that feeds your memory — connect, sync, and watch what flows in">
          {loading ? (
            <M3State state="loading" message="Loading your sources…" />
          ) : error ? (
            <M3State state="error" message={error} />
          ) : (
            KIND_GROUPS.map((group) => {
              const items = connectors.filter(group.match);
              if (items.length === 0) return null;
              return (
                <M3Card key={group.key} title={group.title} action={<span className="text-2xs text-text-disabled">{group.subtitle}</span>}>
                  <ul className="divide-y divide-border-secondary">
                    {items.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-text-primary">{c.label}</p>
                            <StatusDot c={c} />
                          </div>
                          {c.lastError ? (
                            <p className="text-2xs text-danger mt-0.5 line-clamp-2">{c.lastError}</p>
                          ) : isReady(c) && c.kind !== 'manual' ? (
                            <p className="text-2xs text-text-tertiary mt-0.5">
                              Last sync {relTime(c.lastSyncAt)}
                              {c.lastResult ? ` · ${c.lastResult.ingested} in / ${c.lastResult.skipped} skipped` : ''}
                              {` · every ${c.cadenceMins >= 60 ? `${Math.round(c.cadenceMins / 60)}h` : `${c.cadenceMins}m`}`}
                            </p>
                          ) : (
                            <p className="text-2xs text-text-tertiary mt-0.5">{c.setupHint}</p>
                          )}
                        </div>
                        {c.kind === 'manual' ? (
                          <Link href="/buffer" className="text-2xs font-bold uppercase text-accent">
                            Capture
                          </Link>
                        ) : !c.configured ? (
                          <span className="text-2xs font-bold uppercase text-text-disabled">
                            {c.kind === 'oauth' ? 'Connect' : 'Needs setup'}
                          </span>
                        ) : !isReady(c) && c.authStartPath ? (
                          <a href={c.authStartPath} className="text-2xs font-bold uppercase text-accent">
                            Connect
                          </a>
                        ) : (
                          <button
                            onClick={() => syncNow(c)}
                            disabled={syncing === c.id}
                            className="text-2xs font-bold uppercase text-accent disabled:text-text-disabled"
                          >
                            {syncing === c.id ? 'Syncing…' : 'Sync now'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </M3Card>
              );
            })
          )}
        </M3Page>
      </div>
    </AppShell>
  );
}
