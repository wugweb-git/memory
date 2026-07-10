/**
 * Connector registry — the single list of every real source.
 *
 * Three tiers:
 *  1. Free auto-sync (rss/api, no OAuth): GitHub, YouTube, blog RSS, Notion.
 *  2. Manual capture surfaces already working (upload / voice / link / rss url) —
 *     shown for completeness; the scheduler never runs them.
 *  3. OAuth/API-gated (Google, LinkedIn, X, Behance, Dribbble) — honest
 *     "needs credentials" state, NO fake sync.
 */

import { IDENTITY_CONFIG } from '@/config/identity';
import { syncFeed } from './feed';
import { notionConnector } from './notion';
import { googleDriveConnector, googleCalendarConnector } from './google';
import type { Connector, SyncResult } from './types';

/** github.com/<user> → <user>; env override wins. */
function githubUser(): string | null {
  if (process.env.GITHUB_USER) return process.env.GITHUB_USER;
  try {
    const seg = new URL(IDENTITY_CONFIG.GITHUB_URL).pathname.split('/').filter(Boolean)[0];
    return seg || null;
  } catch {
    return null;
  }
}

/** Build a feed-backed connector whose URL is resolved lazily at sync time. */
function feedConnector(cfg: {
  id: string;
  label: string;
  category: Connector['category'];
  cadenceMins: number;
  setupHint: string;
  requires: Connector['requires'];
  resolveUrl: () => string | null;
}): Connector {
  return {
    id: cfg.id,
    label: cfg.label,
    category: cfg.category,
    kind: 'rss',
    requires: cfg.requires,
    cadenceMins: cfg.cadenceMins,
    setupHint: cfg.setupHint,
    configured: () => Boolean(cfg.resolveUrl()),
    async sync(opts): Promise<SyncResult> {
      const feedUrl = cfg.resolveUrl();
      if (!feedUrl) return { ingested: 0, skipped: 0, error: 'NOT_CONFIGURED' };
      return syncFeed({ connectorId: cfg.id, source: cfg.id, feedUrl }, opts);
    },
  };
}

/** A source that only captures via a UI surface — never auto-synced. */
function manualConnector(cfg: {
  id: string;
  label: string;
  category: Connector['category'];
  setupHint: string;
}): Connector {
  return {
    id: cfg.id,
    label: cfg.label,
    category: cfg.category,
    kind: 'manual',
    requires: 'none',
    cadenceMins: 0,
    setupHint: cfg.setupHint,
    configured: () => true,
    async sync(): Promise<SyncResult> {
      return { ingested: 0, skipped: 0, error: 'MANUAL: capture from the Buffer surface' };
    },
  };
}

/** OAuth/API-gated source with no free feed — honest disconnected state. */
function oauthPlaceholder(cfg: {
  id: string;
  label: string;
  category: Connector['category'];
  setupHint: string;
}): Connector {
  return {
    id: cfg.id,
    label: cfg.label,
    category: cfg.category,
    kind: 'oauth',
    requires: 'oauth',
    cadenceMins: 1440,
    setupHint: cfg.setupHint,
    configured: () => false,
    async sync(): Promise<SyncResult> {
      return { ingested: 0, skipped: 0, error: 'NOT_CONFIGURED: connect credentials first' };
    },
  };
}

export const CONNECTORS: Connector[] = [
  // ── Tier 1: free auto-sync ──────────────────────────────────────────────
  feedConnector({
    id: 'github',
    label: 'GitHub',
    category: 'code',
    cadenceMins: 120,
    requires: 'none',
    setupHint: 'Uses your public GitHub activity feed. Override the account with GITHUB_USER.',
    resolveUrl: () => {
      const user = githubUser();
      return user ? `https://github.com/${user}.atom` : null;
    },
  }),
  feedConnector({
    id: 'youtube',
    label: 'YouTube',
    category: 'video',
    cadenceMins: 360,
    requires: 'env',
    setupHint: 'Set YOUTUBE_CHANNEL_ID (from your channel URL) to sync uploads.',
    resolveUrl: () =>
      process.env.YOUTUBE_CHANNEL_ID
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${process.env.YOUTUBE_CHANNEL_ID}`
        : null,
  }),
  feedConnector({
    id: 'blog',
    label: 'Blog / Medium / Substack',
    category: 'writing',
    cadenceMins: 240,
    requires: 'env',
    setupHint: 'Set BLOG_RSS_URL to any RSS/Atom feed (Medium, Substack, Ghost, WordPress…).',
    resolveUrl: () => process.env.BLOG_RSS_URL || null,
  }),
  notionConnector,

  // ── Tier 2: manual capture surfaces (already working) ───────────────────
  manualConnector({ id: 'upload', label: 'File upload', category: 'files', setupHint: 'Upload PDF / text / HTML / Markdown from Buffer → Files.' }),
  manualConnector({ id: 'voice', label: 'Voice', category: 'device', setupHint: 'Record from Buffer → Voice (mic permission).' }),
  manualConnector({ id: 'link', label: 'Article URL', category: 'writing', setupHint: 'Paste a link in Buffer → Link to fetch + extract an article.' }),
  manualConnector({ id: 'rss-url', label: 'RSS (ad-hoc)', category: 'writing', setupHint: 'Paste a feed URL in Buffer → Link for a one-off pull.' }),

  // ── Tier 3: OAuth-gated — real flow (Google) or honest placeholder ──────
  googleDriveConnector,
  googleCalendarConnector,
  oauthPlaceholder({ id: 'linkedin', label: 'LinkedIn', category: 'social', setupHint: 'No free API/feed — needs LinkedIn OAuth (paid/approved app).' }),
  oauthPlaceholder({ id: 'twitter', label: 'X / Twitter', category: 'social', setupHint: 'No free API/feed — needs X API access.' }),
  oauthPlaceholder({ id: 'behance', label: 'Behance', category: 'design', setupHint: 'No public API/RSS — needs an app registration.' }),
  oauthPlaceholder({ id: 'dribbble', label: 'Dribbble', category: 'design', setupHint: 'Needs Dribbble OAuth (client id/secret).' }),
];

export function getConnector(id: string): Connector | undefined {
  return CONNECTORS.find((c) => c.id === id);
}
