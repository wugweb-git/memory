/**
 * In-app connector setup. Lets the owner point a source at an account, channel
 * or feed from the Integrations page instead of editing server env vars.
 *
 * Only non-secret values live here (a GitHub username, a YouTube channel id, a
 * feed URL). Tokens and OAuth secrets stay in env / the token store.
 * Persisted in the Neon `scheduler_state` table, like connector sync state, so
 * no migration is needed:
 *   connector-config:<id>   → { value: string }
 *   connector-custom-feeds  → { feeds: CustomFeed[] }
 *
 * `configured()` on a connector is synchronous, so values are read into a small
 * module cache by `primeConnectorConfig()` at the start of each request.
 */

import { postgres } from '@/lib/db/postgres';

export const MAX_CUSTOM_FEEDS = 10;

export interface CustomFeed {
  id: string;
  label: string;
  url: string;
}

export interface ConfigField {
  /** Short label for the input. */
  label: string;
  placeholder: string;
  inputMode: 'text' | 'url';
  /** One-line help under the input. */
  help: string;
}

/** Connectors the owner can set up from the UI. */
export const CONFIGURABLE: Record<string, ConfigField> = {
  github: {
    label: 'GitHub username',
    placeholder: 'octocat',
    inputMode: 'text',
    help: 'Your public activity is read from github.com/<username>.atom.',
  },
  youtube: {
    label: 'YouTube channel',
    placeholder: 'https://www.youtube.com/channel/UC…',
    inputMode: 'url',
    help: 'Paste your channel URL (the /channel/UC… form) or the channel id that starts with UC.',
  },
  blog: {
    label: 'Feed address',
    placeholder: 'https://yourname.substack.com/feed',
    inputMode: 'url',
    help: 'Any RSS or Atom feed: Medium (medium.com/feed/@you), Substack (/feed), Ghost, WordPress.',
  },
};

// ── Pure validation (exported for tests) ─────────────────────────────────────

export type Parsed = { ok: true; value: string } | { ok: false; error: string };

export function normalizeGithubUser(input: string): Parsed {
  let v = input.trim();
  const m = v.match(/^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)/i);
  if (m) v = m[1];
  v = v.replace(/^@/, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(v)) {
    return { ok: false, error: 'Enter a GitHub username, like octocat.' };
  }
  return { ok: true, value: v };
}

export function normalizeYoutubeChannel(input: string): Parsed {
  const v = input.trim();
  const fromUrl = v.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/i);
  const id = fromUrl ? fromUrl[1] : /^UC[A-Za-z0-9_-]{22}$/.test(v) ? v : null;
  if (!id) {
    return {
      ok: false,
      error: 'Use the channel URL that contains /channel/UC… or the 24 character id that starts with UC. A @handle URL does not work.',
    };
  }
  return { ok: true, value: id };
}

export function normalizeFeedUrl(input: string): Parsed {
  const v = input.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    return { ok: false, error: 'Enter a full web address, like https://example.com/feed.' };
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) {
    return { ok: false, error: 'Enter a full web address, like https://example.com/feed.' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'Remove the username and password from the address.' };
  }
  return { ok: true, value: url.toString() };
}

export function normalizeConfigValue(id: string, input: string): Parsed {
  if (id === 'github') return normalizeGithubUser(input);
  if (id === 'youtube') return normalizeYoutubeChannel(input);
  if (id === 'blog') return normalizeFeedUrl(input);
  return { ok: false, error: 'This source cannot be set up here.' };
}

export function customFeedId(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  return `feed-${(h >>> 0).toString(36)}`;
}

// ── Persistence + cache ──────────────────────────────────────────────────────

let values: Record<string, string> = {};
let feeds: CustomFeed[] = [];

const valueKey = (id: string) => `connector-config:${id}`;
const FEEDS_KEY = 'connector-custom-feeds';

/** Load saved setup into the cache. Fails open: env fallbacks keep working. */
export async function primeConnectorConfig(): Promise<void> {
  try {
    const rows = await postgres.schedulerState.findMany({
      where: { OR: [{ key: { startsWith: 'connector-config:' } }, { key: FEEDS_KEY }] },
    });
    const next: Record<string, string> = {};
    let nextFeeds: CustomFeed[] = [];
    for (const r of rows) {
      const v = r.value as { value?: unknown; feeds?: unknown } | null;
      if (r.key === FEEDS_KEY && Array.isArray(v?.feeds)) {
        nextFeeds = (v!.feeds as CustomFeed[]).filter(
          (f) => f && typeof f.id === 'string' && typeof f.url === 'string' && typeof f.label === 'string',
        );
      } else if (r.key.startsWith('connector-config:') && typeof v?.value === 'string' && v.value) {
        next[r.key.slice('connector-config:'.length)] = v.value;
      }
    }
    values = next;
    feeds = nextFeeds;
  } catch {
    // keep the previous cache
  }
}

/** Value saved from the UI for a connector, or null. Read after priming. */
export function getConfigValue(id: string): string | null {
  return values[id] ?? null;
}

export function getCustomFeeds(): CustomFeed[] {
  return feeds;
}

export async function setConfigValue(id: string, value: string | null): Promise<void> {
  if (value === null) {
    await postgres.schedulerState.deleteMany({ where: { key: valueKey(id) } });
    delete values[id];
    return;
  }
  await postgres.schedulerState.upsert({
    where: { key: valueKey(id) },
    create: { key: valueKey(id), value: { value } as any },
    update: { value: { value } as any },
  });
  values[id] = value;
}

async function saveFeeds(next: CustomFeed[]): Promise<void> {
  await postgres.schedulerState.upsert({
    where: { key: FEEDS_KEY },
    create: { key: FEEDS_KEY, value: { feeds: next } as any },
    update: { value: { feeds: next } as any },
  });
  feeds = next;
}

export async function addCustomFeed(label: string, url: string): Promise<{ ok: true; feed: CustomFeed } | { ok: false; error: string }> {
  await primeConnectorConfig();
  const parsed = normalizeFeedUrl(url);
  if (!parsed.ok) return parsed;
  const name = label.trim().slice(0, 60) || new URL(parsed.value).hostname.replace(/^www\./, '');
  const id = customFeedId(parsed.value);
  if (feeds.some((f) => f.id === id)) return { ok: false, error: 'That feed is already added.' };
  if (feeds.length >= MAX_CUSTOM_FEEDS) return { ok: false, error: `You can add up to ${MAX_CUSTOM_FEEDS} feeds. Remove one first.` };
  const feed = { id, label: name, url: parsed.value };
  await saveFeeds([...feeds, feed]);
  return { ok: true, feed };
}

export async function removeCustomFeed(id: string): Promise<boolean> {
  await primeConnectorConfig();
  if (!feeds.some((f) => f.id === id)) return false;
  await saveFeeds(feeds.filter((f) => f.id !== id));
  await postgres.schedulerState.deleteMany({ where: { key: `connector:${id}` } });
  return true;
}
