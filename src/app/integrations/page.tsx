'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { AppToastContainer } from "@/app/component/AppToastContainer";
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

/** Text equivalent of the status dot (WCAG 1.4.1: colour is never the only signal). */
function statusLabel(c: ConnectorStatus): string {
  if (c.lastError) return 'Sync error';
  if (!c.configured) return 'Needs setup';
  if (!isReady(c)) return 'Not connected';
  if (c.kind === 'manual') return 'Manual capture';
  return c.lastSyncAt ? 'Connected' : 'Ready, not synced yet';
}

/** Status dot colour; always paired with statusLabel for assistive tech. */
function statusColor(c: ConnectorStatus): string {
  if (c.lastError) return 'bg-danger';
  if (!c.configured) return 'bg-text-disabled';
  if (!isReady(c)) return 'bg-warning';
  if (c.kind === 'manual') return 'bg-text-tertiary';
  return c.lastSyncAt ? 'bg-success' : 'bg-warning';
}

/** One calm line; sync metrics render as a visible detail line (no hover-only title). */
function secondaryLine(c: ConnectorStatus): { text: string; title?: string; danger?: boolean } {
  if (c.lastError) {
    return { text: `Last sync failed: ${c.lastError}`, danger: true, title: c.lastSyncAt ? `Last successful sync ${relTime(c.lastSyncAt)}` : undefined };
  }
  if (!c.configured) return { text: c.setupHint };
  if (!isReady(c)) return { text: 'Credentials are set. Connect your account to start syncing.' };
  if (c.kind === 'manual') return { text: c.setupHint };
  const cadence = c.cadenceMins >= 60 ? `${Math.round(c.cadenceMins / 60)}h` : `${c.cadenceMins}m`;
  const detail = c.lastResult
    ? `Last run: ${c.lastResult.ingested} new, ${c.lastResult.skipped} skipped. Syncs about every ${cadence}.`
    : `Syncs about every ${cadence}.`;
  return { text: c.lastSyncAt ? `Last synced ${relTime(c.lastSyncAt)}` : 'Never synced yet', title: detail };
}

const PILL = 'shrink-0 inline-flex min-h-11 items-center text-xs font-bold rounded-lg px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

const KIND_GROUPS: Array<{ key: string; title: string; subtitle: string; match: (c: ConnectorStatus) => boolean }> = [
  { key: 'auto', title: 'Auto-sync sources', subtitle: 'Fetched on a schedule. You can also sync on demand.', match: (c) => c.kind === 'rss' || c.kind === 'api' || (c.kind === 'oauth' && c.configured) },
  { key: 'manual', title: 'Manual capture', subtitle: 'Added by hand from the Buffer page', match: (c) => c.kind === 'manual' },
  { key: 'oauth', title: 'Needs setup', subtitle: 'Not syncing until credentials are added', match: (c) => (c.kind === 'oauth' && !c.configured) || c.kind === 'device' },
];

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<{ connectors: ConnectorStatus[] }>('/api/sources');
      setConnectors(data.connectors ?? []);
      setError(null);
    } catch (e: unknown) {
      const status = (e as { status?: number } | null)?.status;
      setError(
        status === 401
          ? 'Your session expired. Sign in again to see your sources.'
          : e instanceof Error ? e.message : 'Could not load your sources. Check your connection and try again.',
      );
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
      error: ['Google connection failed. Check the OAuth app settings, then try again.', 'err'],
      badstate: ['Google connection expired — try again.', 'err'],
      nocode: ['Google did not return an authorization code. Start the connection again.', 'err'],
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
      return <Link href="/buffer" aria-label={`Open Buffer to capture: ${c.label}`} className={`${PILL} border border-border-primary text-text-primary hover:bg-bg-secondary`}>Open Buffer</Link>;
    }
    if (!c.configured) {
      // No action is possible from the UI; the hint on the card says what to set.
      return null;
    }
    if (!isReady(c) && c.authStartPath) {
      return <a href={c.authStartPath} aria-label={`Connect ${c.label}`} className={`${PILL} bg-text-primary text-bg-primary hover:bg-text-secondary`}>Connect</a>;
    }
    if (!isReady(c)) return null; // consent still missing and no connect link: nothing to run
    return (
      <button
        type="button"
        onClick={() => syncNow(c)}
        disabled={syncing === c.id}
        aria-label={`${c.lastError ? 'Retry sync' : 'Sync now'}: ${c.label}`}
        className={`${PILL} border border-border-primary text-text-primary hover:bg-bg-secondary disabled:text-text-tertiary disabled:hover:bg-transparent`}
      >
        {syncing === c.id ? 'Syncing…' : c.lastError ? 'Retry sync' : 'Sync now'}
      </button>
    );
  }

  return (
    <AppShell>
      <AppToastContainer position="bottom-right" theme="light" />
      <div>
        <M3Page title="Integrations" subtitle="Every source that feeds your memory. See what is connected, what needs setup, and when each last synced.">
          {loading ? (
            <M3State state="loading" message="Loading your sources…" />
          ) : error ? (
            <div className="space-y-3">
              <M3State state="error" message={error} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setLoading(true); load(); }}
                  className="min-h-11 px-4 rounded-xl bg-text-primary text-sm font-bold text-bg-primary"
                >
                  Try again
                </button>
                <Link href="/login?next=/integrations" className="inline-flex min-h-11 items-center rounded-xl border border-border-primary px-4 text-sm font-bold text-text-primary">Sign in again</Link>
              </div>
            </div>
          ) : connectors.length === 0 ? (
            <M3State state="empty" message="No sources are available. If this looks wrong, reload the page or check the server logs." />
          ) : (
            KIND_GROUPS.map((group) => {
              const items = connectors.filter(group.match);
              if (items.length === 0) return null;
              return (
                <M3Card key={group.key} title={group.title} action={<span className="text-xs text-text-tertiary text-right">{group.subtitle}</span>}>
                  <ul className="space-y-2">
                    {items.map((c) => {
                      const Icon = iconFor(c);
                      const sec = secondaryLine(c);
                      return (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-border-secondary bg-bg-primary p-3"
                        >
                          <div className="h-9 w-9 shrink-0 rounded-xl bg-bg-secondary flex items-center justify-center">
                            <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1 basis-48">
                            <p className="text-sm font-bold text-text-primary break-words">{c.label}</p>
                            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${statusColor(c)}`} />
                              {statusLabel(c)}
                            </p>
                            <p className={`text-xs mt-0.5 break-words ${sec.danger ? 'text-danger' : 'text-text-tertiary'}`}>{sec.text}</p>
                            {sec.title && <p className="text-xs mt-0.5 text-text-tertiary break-words">{sec.title}</p>}
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
