'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Code2, FileText, Video, BookOpen, Share2, Palette, File as FileIcon,
  Smartphone, Mail, Calendar, HardDrive, Mic, Upload, Link2, Rss,
  type LucideIcon,
} from 'lucide-react';
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

// Per-connector iconography — an id override where a clean icon fits, else by category.
const ID_ICONS: Record<string, LucideIcon> = {
  'google-calendar': Calendar,
  'google-drive': HardDrive,
  voice: Mic,
  upload: Upload,
  link: Link2,
  'rss-url': Rss,
};
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  code: Code2,
  writing: FileText,
  video: Video,
  knowledge: BookOpen,
  social: Share2,
  design: Palette,
  files: FileIcon,
  device: Smartphone,
  email: Mail,
};
function iconFor(c: ConnectorStatus): LucideIcon {
  return ID_ICONS[c.id] ?? CATEGORY_ICONS[c.category] ?? FileIcon;
}

/** Colour-only status (the label lives in the calm secondary line / action). */
function statusColor(c: ConnectorStatus): string {
  if (c.lastError) return 'bg-danger';
  if (!c.configured) return 'bg-text-disabled';
  if (!isReady(c)) return 'bg-warning';
  return c.lastSyncAt ? 'bg-success' : 'bg-warning';
}

/** One calm line; full sync metrics are tucked into the row's hover title. */
function secondaryLine(c: ConnectorStatus): { text: string; title?: string; danger?: boolean } {
  if (c.lastError) return { text: c.lastError, danger: true };
  if (isReady(c) && c.kind !== 'manual') {
    const cadence = c.cadenceMins >= 60 ? `${Math.round(c.cadenceMins / 60)}h` : `${c.cadenceMins}m`;
    const detail = c.lastResult
      ? `${c.lastResult.ingested} in / ${c.lastResult.skipped} skipped · every ${cadence}`
      : `Syncs every ${cadence}`;
    return { text: c.lastSyncAt ? `Synced ${relTime(c.lastSyncAt)}` : 'Ready to sync', title: detail };
  }
  return { text: c.setupHint };
}

const PILL = 'shrink-0 text-2xs font-bold rounded-lg px-2.5 py-1 transition-colors';

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

  function renderAction(c: ConnectorStatus) {
    if (c.kind === 'manual') {
      return <Link href="/buffer" className={`${PILL} text-accent hover:bg-bg-tertiary`}>Capture</Link>;
    }
    if (!c.configured) {
      return <span className={`${PILL} text-text-disabled`}>{c.kind === 'oauth' ? 'Connect' : 'Needs setup'}</span>;
    }
    if (!isReady(c) && c.authStartPath) {
      return <a href={c.authStartPath} className={`${PILL} text-accent hover:bg-bg-tertiary`}>Connect</a>;
    }
    return (
      <button
        onClick={() => syncNow(c)}
        disabled={syncing === c.id}
        className={`${PILL} text-accent hover:bg-bg-tertiary disabled:text-text-disabled disabled:hover:bg-transparent`}
      >
        {syncing === c.id ? 'Syncing…' : 'Sync now'}
      </button>
    );
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
                  <ul className="space-y-2">
                    {items.map((c) => {
                      const Icon = iconFor(c);
                      const sec = secondaryLine(c);
                      return (
                        <li
                          key={c.id}
                          title={sec.title}
                          className="flex items-center gap-3 rounded-xl border border-border-secondary bg-bg-primary p-3 hover:bg-bg-secondary transition-colors"
                        >
                          <div className="relative shrink-0">
                            <div className="h-9 w-9 rounded-xl bg-bg-secondary flex items-center justify-center">
                              <Icon className="h-4 w-4 text-text-secondary" />
                            </div>
                            <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-bg-primary ${statusColor(c)}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-text-primary truncate">{c.label}</p>
                            <p className={`text-2xs mt-0.5 ${sec.danger ? 'text-danger line-clamp-2' : 'text-text-tertiary'}`}>{sec.text}</p>
                          </div>
                          {renderAction(c)}
                        </li>
                      );
                    })}
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
