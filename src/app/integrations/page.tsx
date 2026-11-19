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
import { M3Button, M3Card, M3Page, M3State } from '@/components/ui/m3';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { AppShell } from '@/app/component/AppShell';
import { apiRequest } from '@/lib/ui/api-client';
import { BrandIcon, brandIconFor } from '@/components/ui/brand-icon';
import { AutoPromoteCard } from './AutoPromoteCard';

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
  setup?: { label: string; placeholder: string; inputMode: 'text' | 'url'; help: string };
  setupValue?: string | null;
  custom?: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  lastResult: { ingested: number; skipped: number; scanned?: number } | null;
};

type Health = 'error' | 'unset' | 'needs-connect' | 'waiting' | 'healthy' | 'manual';

function relTime(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (Number.isNaN(mins)) return 'never';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

/** OAuth connectors need consent (connected) on top of configured (creds set). */
function isReady(c: ConnectorStatus): boolean {
  return c.configured && (c.connected ?? true);
}

function healthOf(c: ConnectorStatus): Health {
  if (c.kind === 'manual') return 'manual';
  if (c.lastError) return 'error';
  if (!c.configured) return 'unset';
  if (!isReady(c)) return 'needs-connect';
  return c.lastSyncAt ? 'healthy' : 'waiting';
}

// Per-connector iconography: an id override where a clean icon fits, else by category.
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

/** Plain-language status; the dot colour is never the only signal (WCAG 1.4.1). */
const HEALTH_COPY: Record<Health, { label: string; dot: string }> = {
  error: { label: 'Last sync failed', dot: 'bg-danger' },
  unset: { label: 'Not set up', dot: 'bg-text-disabled' },
  'needs-connect': { label: 'Needs connecting', dot: 'bg-warning' },
  waiting: { label: 'Ready, not synced yet', dot: 'bg-warning' },
  healthy: { label: 'Working', dot: 'bg-success' },
  manual: { label: 'Manual', dot: 'bg-text-disabled' },
};

/** One calm line explaining the status and what happens next. */
function detailLine(c: ConnectorStatus): { text: string; danger?: boolean } {
  const h = healthOf(c);
  const cadence = c.cadenceMins >= 60 ? `${Math.round(c.cadenceMins / 60)} h` : `${c.cadenceMins} min`;
  if (h === 'error') {
    const reason = c.lastError ?? 'The last sync did not finish.';
    return { text: c.lastSyncAt ? `${reason} (last worked ${relTime(c.lastSyncAt)})` : reason, danger: true };
  }
  if (h === 'healthy') {
    const r = c.lastResult;
    const counts = r ? `${r.ingested} new, ${r.skipped} skipped. ` : '';
    return { text: `Synced ${relTime(c.lastSyncAt)}. ${counts}Runs every ${cadence}.` };
  }
  if (h === 'waiting') return { text: `Nothing synced yet. Runs every ${cadence}, or sync now.` };
  return { text: c.setupHint };
}

const ACTION_BASE =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:shrink-0';
const ACTION_PRIMARY = `${ACTION_BASE} bg-text-primary text-bg-primary hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed`;
const ACTION_QUIET = `${ACTION_BASE} border border-border-primary bg-bg-elevated text-text-primary hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed`;

const KIND_GROUPS: Array<{ key: string; title: string; subtitle: string; match: (c: ConnectorStatus) => boolean }> = [
  { key: 'auto', title: 'Auto-sync sources', subtitle: 'Fetched on a schedule. You can sync any of them now.', match: (c) => c.kind === 'rss' || c.kind === 'api' || (c.kind === 'oauth' && c.configured) },
  { key: 'manual', title: 'Manual capture', subtitle: 'Added by hand from the Buffer page.', match: (c) => c.kind === 'manual' },
  { key: 'oauth', title: 'Needs credentials', subtitle: 'These start syncing as soon as their keys are added.', match: (c) => (c.kind === 'oauth' && !c.configured) || c.kind === 'device' },
];

// Errors first, then things that need a step from you, then the healthy ones.
const HEALTH_ORDER: Record<Health, number> = { error: 0, 'needs-connect': 1, waiting: 2, healthy: 3, unset: 4, manual: 5 };

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedName, setFeedName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedError, setFeedError] = useState<string | null>(null);
  const [addingFeed, setAddingFeed] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setExpired(false);
    try {
      const data = await apiRequest<{ connectors: ConnectorStatus[] }>('/api/sources');
      setConnectors(data.connectors ?? []);
    } catch (e: unknown) {
      const status = (e as { status?: number } | null)?.status;
      setExpired(status === 401);
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
      connected: ['Google connected. Your sources can sync now.', 'ok'],
      denied: ['Google connection was denied. Try Connect again and allow access.', 'err'],
      error: ['Google connection failed. Check the OAuth app settings, then try again.', 'err'],
      badstate: ['Google connection expired. Start Connect again.', 'err'],
      nocode: ['Google did not return an authorization code. Start Connect again.', 'err'],
    };
    const [msg, tone] = messages[status] ?? [`Google: ${status}`, 'err'];
    if (tone === 'ok') toast.success(msg);
    else toast.error(msg);
    window.history.replaceState({}, '', '/integrations');
  }, []);

  async function syncNow(c: ConnectorStatus) {
    setSyncing(c.id);
    setAnnounce(`Syncing ${c.label}`);
    try {
      const res = await apiRequest<{ ingested: number; skipped: number }>(`/api/sources/${c.id}/sync`, {
        method: 'POST',
        body: {},
        timeoutMs: 30_000,
      });
      toast.success(`${c.label}: ${res.ingested} new, ${res.skipped} skipped`);
      setAnnounce(`${c.label} synced`);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : `Sync failed for ${c.label}`;
      toast.error(msg);
      setAnnounce(`Sync failed for ${c.label}`);
    } finally {
      setSyncing(null);
    }
  }

  function startSetup(c: ConnectorStatus) {
    setEditing(c.id);
    setDraft(c.setupValue ?? '');
    setFieldError(null);
  }

  async function saveSetup(c: ConnectorStatus, value: string) {
    setSaving(true);
    setFieldError(null);
    try {
      await apiRequest(`/api/sources/${c.id}/config`, { method: 'PUT', body: { value } });
      setEditing(null);
      toast.success(value.trim() ? `${c.label} saved. Syncing now.` : `${c.label} removed.`);
      setAnnounce(value.trim() ? `${c.label} saved` : `${c.label} removed`);
      await load();
      if (value.trim()) await syncNow({ ...c, configured: true });
    } catch (e: unknown) {
      setFieldError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addFeed() {
    setAddingFeed(true);
    setFeedError(null);
    try {
      const res = await apiRequest<{ feed: { id: string; label: string } }>('/api/sources/feeds', {
        method: 'POST',
        body: { label: feedName, url: feedUrl },
      });
      setFeedName('');
      setFeedUrl('');
      toast.success(`${res.feed.label} added. Syncing now.`);
      setAnnounce(`${res.feed.label} added`);
      await load();
      await syncNow({ id: res.feed.id, label: res.feed.label } as ConnectorStatus);
    } catch (e: unknown) {
      setFeedError(e instanceof Error ? e.message : 'Could not add the feed. Try again.');
    } finally {
      setAddingFeed(false);
    }
  }

  async function removeFeed(c: ConnectorStatus) {
    try {
      await apiRequest(`/api/sources/feeds/${c.id}`, { method: 'DELETE' });
      toast.success(`${c.label} removed.`);
      setAnnounce(`${c.label} removed`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Could not remove ${c.label}.`);
    }
  }

  /** The single next step for a connector. */
  function renderAction(c: ConnectorStatus) {
    const h = healthOf(c);
    if (c.kind === 'manual') {
      return <Link href="/buffer" aria-label={`Capture with ${c.label}`} className={ACTION_QUIET}>Capture</Link>;
    }
    if (h === 'unset' && c.setup) {
      return (
        <button type="button" onClick={() => startSetup(c)} aria-label={`Set up ${c.label}`} className={ACTION_PRIMARY}>
          Set up
        </button>
      );
    }
    if (h === 'unset') return null;
    if (h === 'needs-connect' && c.authStartPath) {
      return <a href={c.authStartPath} aria-label={`Connect ${c.label}`} className={ACTION_PRIMARY}>Connect</a>;
    }
    // Consent is still missing and there is no connect link: nothing to run.
    if (h === 'needs-connect') return null;
    const busy = syncing === c.id;
    return (
      <div className="flex w-full flex-row flex-wrap gap-2 sm:w-auto sm:flex-nowrap [&>*]:min-w-[7rem] [&>*]:flex-1 sm:[&>*]:flex-none">
        <button
          type="button"
          onClick={() => syncNow(c)}
          disabled={busy}
          aria-label={`${h === 'error' ? 'Retry sync' : 'Sync now'}: ${c.label}`}
          className={h === 'error' || h === 'waiting' ? ACTION_PRIMARY : ACTION_QUIET}
        >
          {busy ? 'Syncing…' : h === 'error' ? 'Retry sync' : 'Sync now'}
        </button>
        {h === 'error' && c.authStartPath ? (
          <a href={c.authStartPath} aria-label={`Reconnect ${c.label}`} className={ACTION_QUIET}>Reconnect</a>
        ) : null}
        {c.setup ? (
          <button type="button" onClick={() => startSetup(c)} aria-label={`Change ${c.label}`} className={ACTION_QUIET}>Change</button>
        ) : null}
        {c.custom ? (
          <button type="button" onClick={() => removeFeed(c)} aria-label={`Remove ${c.label}`} className={ACTION_QUIET}>Remove</button>
        ) : null}
      </div>
    );
  }

  const trackable = connectors.filter((c) => c.kind !== 'manual');
  const attention = trackable.filter((c) => ['error', 'needs-connect'].includes(healthOf(c))).length;
  const working = trackable.filter((c) => ['healthy', 'waiting'].includes(healthOf(c))).length;
  const notSetUp = trackable.filter((c) => healthOf(c) === 'unset').length;

  return (
    <AppShell>
      <AppToastContainer position="bottom-right" theme="light" />
      <M3Page title="Integrations" subtitle="The sources that feed your memory. Check they are healthy, connect new ones and sync on demand.">
          <p role="status" aria-live="polite" className="sr-only">{announce}</p>
          {loading ? (
            <div className="space-y-3" role="status" aria-label="Loading your sources">
              <Skeleton className="h-16 w-full motion-reduce:animate-none" />
              <Skeleton className="h-20 w-full motion-reduce:animate-none" />
              <Skeleton className="h-20 w-full motion-reduce:animate-none" />
              <Skeleton className="h-20 w-full motion-reduce:animate-none" />
            </div>
          ) : error ? (
            <div className="space-y-3">
              <M3State state="error" message={error} />
              <div className="flex flex-wrap gap-2">
                {expired ? (
                  <Link href="/login?next=/integrations" className="inline-flex min-h-11 items-center rounded-xl bg-text-primary px-4 text-sm font-semibold text-bg-primary">Sign in</Link>
                ) : null}
                <M3Button tone={expired ? 'secondary' : 'primary'} onClick={() => { setLoading(true); load(); }}>Try again</M3Button>
              </div>
            </div>
          ) : connectors.length === 0 ? (
            <EmptyState
              title="No sources yet"
              hint="Sources show up here once they are registered. Capture something by hand in the meantime."
              action={<Link href="/buffer" className="inline-flex min-h-11 items-center rounded-xl bg-text-primary px-4 text-sm font-semibold text-bg-primary">Open the Buffer</Link>}
            />
          ) : (
            <>
              <section aria-label="Connection health" className="rounded-3xl border border-border-secondary bg-bg-elevated p-4">
                <p className="text-md font-semibold text-text-primary">
                  {attention > 0
                    ? `${attention} ${attention === 1 ? 'source needs' : 'sources need'} your attention`
                    : working > 0 ? 'Everything you connected is working' : 'No sources are connected yet'}
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {working} working, {attention} need attention, {notSetUp} not set up
                </p>
              </section>

              {KIND_GROUPS.map((group) => {
                const items = connectors
                  .filter(group.match)
                  .sort((a, b) => HEALTH_ORDER[healthOf(a)] - HEALTH_ORDER[healthOf(b)]);
                if (items.length === 0) return null;
                return (
                  <M3Card key={group.key} title={group.title}>
                    <p className="-mt-1 text-xs text-text-tertiary">{group.subtitle}</p>
                    <ul className="space-y-2">
                      {items.map((c) => {
                        const Icon = iconFor(c);
                        const brand = brandIconFor(c.id, c.custom);
                        const h = healthOf(c);
                        const copy = HEALTH_COPY[h];
                        const sec = detailLine(c);
                        return (
                          <li
                            key={c.id}
                            className="rounded-2xl border border-border-secondary bg-bg-primary p-3"
                          >
                           <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-xl bg-bg-secondary flex items-center justify-center">
                                {brand ? (
                                  <BrandIcon icon={brand} className="h-5 w-5" />
                                ) : (
                                  <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-text-primary break-words">{c.label}</p>
                                {h !== 'manual' ? (
                                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${copy.dot}`} />
                                    <span>{copy.label}</span>
                                  </p>
                                ) : null}
                                <p className={`mt-0.5 text-xs break-words ${sec.danger ? 'text-danger' : 'text-text-tertiary'}`}>{sec.text}</p>
                              </div>
                            </div>
                            {renderAction(c)}
                           </div>
                           {editing === c.id && c.setup ? (
                            <form
                              className="mt-3 space-y-2 border-t border-border-secondary pt-3"
                              onSubmit={(e) => { e.preventDefault(); saveSetup(c, draft); }}
                            >
                              <label htmlFor={`setup-${c.id}`} className="block text-sm font-medium text-text-primary">{c.setup.label}</label>
                              <input
                                id={`setup-${c.id}`}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                type="text"
                                inputMode={c.setup.inputMode === 'url' ? 'url' : 'text'}
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder={c.setup.placeholder}
                                aria-describedby={`setup-${c.id}-help${fieldError ? ` setup-${c.id}-err` : ''}`}
                                aria-invalid={fieldError ? true : undefined}
                                className="min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              />
                              <p id={`setup-${c.id}-help`} className="text-xs text-text-tertiary">{c.setup.help}</p>
                              {fieldError ? <p id={`setup-${c.id}-err`} role="alert" className="text-xs text-danger">{fieldError}</p> : null}
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button type="submit" disabled={saving || !draft.trim()} className={ACTION_PRIMARY}>{saving ? 'Saving…' : 'Save and sync'}</button>
                                <button type="button" onClick={() => setEditing(null)} className={ACTION_QUIET}>Cancel</button>
                                {c.setupValue ? (
                                  <button type="button" disabled={saving} onClick={() => saveSetup(c, '')} className={ACTION_QUIET}>Remove</button>
                                ) : null}
                              </div>
                            </form>
                           ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </M3Card>
                );
              })}

              <AutoPromoteCard />

              <M3Card title="Add a feed">
                <p className="-mt-1 text-xs text-text-tertiary">
                  Follow any blog, newsletter or channel that has an RSS or Atom feed. New posts are pulled in on a schedule.
                </p>
                <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); addFeed(); }}>
                  <label htmlFor="feed-name" className="block text-sm font-medium text-text-primary">Name <span className="font-normal text-text-tertiary">(optional)</span></label>
                  <input
                    id="feed-name"
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                    type="text"
                    maxLength={60}
                    placeholder="My newsletter"
                    className="min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  <label htmlFor="feed-url" className="block text-sm font-medium text-text-primary">Feed address</label>
                  <input
                    id="feed-url"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="https://example.com/feed"
                    aria-describedby={feedError ? 'feed-url-err' : undefined}
                    aria-invalid={feedError ? true : undefined}
                    className="min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  {feedError ? <p id="feed-url-err" role="alert" className="text-xs text-danger">{feedError}</p> : null}
                  <button type="submit" disabled={addingFeed || !feedUrl.trim()} className={ACTION_PRIMARY}>{addingFeed ? 'Adding…' : 'Add and sync'}</button>
                </form>
              </M3Card>
            </>
          )}
      </M3Page>
    </AppShell>
  );
}
