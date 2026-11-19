/**
 * Data-export import path for platforms with no free API (LinkedIn, X).
 * The owner uploads the platform's own archive (zip) or a single CSV/JSON/JS
 * file; we parse it locally and buffer the items. No credentials involved.
 *
 * Privacy: LinkedIn connections/messages/contacts files are never read.
 */

import { parseCsv } from '@/lib/ingestion/csv';
import type { Connector, SyncResult } from '@/lib/ingestion/connectors/types';
import { ingestItems, recordError, type PendingItem } from './sync-items';
import { isZip, readZip } from './zip';

const MAX_IMPORT_ITEMS = 1000;

const base = (n: string) => n.split('/').pop() ?? n;
const strip = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

function col(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const k = Object.keys(row).find((x) => x.trim().toLowerCase() === n.toLowerCase());
    if (k && row[k]?.trim()) return row[k].trim();
  }
  return '';
}

// ── LinkedIn ─────────────────────────────────────────────────────────────

export function parseLinkedInFile(name: string, data: Buffer): PendingItem[] {
  const file = base(name).toLowerCase();
  const text = data.toString('utf8').replace(/^﻿/, '');
  const out: PendingItem[] = [];

  if (file === 'shares.csv' || file === 'comments.csv') {
    const kind = file === 'shares.csv' ? 'post' : 'comment';
    for (const r of parseCsv(text)) {
      const body = col(r, 'ShareCommentary', 'Message');
      if (!body) continue;
      const date = col(r, 'Date');
      const link = col(r, 'ShareLink', 'Link');
      out.push({
        sourceId: `li:${kind}:${link || `${date}:${body.slice(0, 40)}`}`,
        type: `linkedin_${kind}`,
        payload: { title: body.slice(0, 80), text: body, url: link || null, shared_url: col(r, 'SharedUrl') || null, published_at: date || null },
      });
    }
  } else if (file === 'positions.csv') {
    for (const r of parseCsv(text)) {
      const company = col(r, 'Company Name');
      const title = col(r, 'Title');
      if (!company && !title) continue;
      const started = col(r, 'Started On');
      out.push({
        sourceId: `li:position:${company}:${title}:${started}`,
        type: 'linkedin_position',
        payload: {
          title: `${title} at ${company}`.trim(),
          text: [`${title} at ${company}`, col(r, 'Description'), col(r, 'Location')].filter(Boolean).join('\n'),
          started_on: started || null,
          finished_on: col(r, 'Finished On') || null,
        },
      });
    }
  } else if (file === 'profile.csv') {
    for (const r of parseCsv(text)) {
      const headline = col(r, 'Headline');
      const summary = col(r, 'Summary');
      if (!headline && !summary) continue;
      out.push({ sourceId: `li:profile:${headline}:${summary.length}`, type: 'linkedin_profile', payload: { title: headline || 'LinkedIn profile', text: [headline, summary].filter(Boolean).join('\n') } });
    }
  } else if (file.endsWith('.html') && /(^|\/)articles\//i.test(name)) {
    const html = data.toString('utf8');
    const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? base(name);
    const body = strip(html);
    if (body.length > 40) out.push({ sourceId: `li:article:${name}`, type: 'linkedin_article', payload: { title: strip(title), text: body } });
  }
  return out;
}

const LI_WANTED = new Set(['shares.csv', 'comments.csv', 'positions.csv', 'profile.csv']);

export function parseLinkedInExport(filename: string, data: Buffer): PendingItem[] {
  if (isZip(data)) {
    const files = readZip(data, (n) => LI_WANTED.has(base(n).toLowerCase()) || (/(^|\/)articles\/.+\.html$/i.test(n)));
    const items: PendingItem[] = [];
    for (const [n, buf] of files) items.push(...parseLinkedInFile(n, buf));
    return items;
  }
  return parseLinkedInFile(filename, data);
}

// ── X / Twitter ──────────────────────────────────────────────────────────

/** Accepts `window.YTD.tweets.part0 = [...]` (archive .js) or plain JSON arrays. */
export function parseXTweets(text: string): PendingItem[] {
  const start = text.indexOf('[');
  if (start < 0) return [];
  let arr: any;
  try {
    arr = JSON.parse(text.slice(start));
  } catch {
    throw new Error('Could not parse tweets file (expected the archive tweets.js / tweet.js or a JSON array)');
  }
  if (!Array.isArray(arr)) return [];
  const out: PendingItem[] = [];
  for (const entry of arr) {
    const t = entry?.tweet ?? entry;
    const id = t?.id_str ?? t?.id;
    const body: string = t?.full_text ?? t?.text ?? '';
    if (!id || !body.trim()) continue;
    out.push({
      sourceId: `x:tweet:${id}`,
      type: 'x_post',
      payload: {
        title: body.slice(0, 80),
        text: body,
        published_at: t.created_at ?? null,
        is_retweet: /^RT @/.test(body),
        is_reply: Boolean(t.in_reply_to_status_id_str),
        lang: t.lang ?? null,
        likes: Number(t.favorite_count) || 0,
        retweets: Number(t.retweet_count) || 0,
      },
    });
  }
  return out;
}

export function parseXExport(filename: string, data: Buffer): PendingItem[] {
  if (isZip(data)) {
    const files = readZip(data, (n) => /(^|\/)(tweets?|note-tweet)\.js$/i.test(n));
    const items: PendingItem[] = [];
    for (const [n, buf] of files) if (!/note-tweet/i.test(n)) items.push(...parseXTweets(buf.toString('utf8')));
    return items;
  }
  const text = data.toString('utf8').replace(/^﻿/, '');
  if (/\.csv$/i.test(filename)) {
    return parseCsv(text).flatMap((r): PendingItem[] => {
      const id = col(r, 'tweet_id', 'id');
      const body = col(r, 'text', 'full_text', 'tweet');
      return id && body ? [{ sourceId: `x:tweet:${id}`, type: 'x_post', payload: { title: body.slice(0, 80), text: body, published_at: col(r, 'created_at', 'timestamp') || null } }] : [];
    });
  }
  return parseXTweets(text);
}

// ── import entry point + connectors ──────────────────────────────────────

export type ImportPlatform = 'linkedin' | 'twitter';

export async function importExportFile(platform: ImportPlatform, filename: string, data: Buffer): Promise<SyncResult> {
  const id = platform;
  try {
    const items = platform === 'linkedin' ? parseLinkedInExport(filename, data) : parseXExport(filename, data);
    if (items.length === 0) {
      return recordError(id, 'No importable items found in the uploaded file (check it is the platform data export)');
    }
    return await ingestItems({ connectorId: id, source: platform === 'linkedin' ? 'linkedin_export' : 'x_export', items, inputMode: 'upload', max: MAX_IMPORT_ITEMS });
  } catch (err: any) {
    return recordError(id, err?.message ?? String(err));
  }
}

function exportConnector(cfg: { id: ImportPlatform; label: string; setupHint: string }): Connector {
  return {
    id: cfg.id,
    label: cfg.label,
    category: 'social',
    kind: 'manual', // never auto-synced; there is no API path
    requires: 'none',
    cadenceMins: 0,
    setupHint: cfg.setupHint,
    configured: () => true, // the file-import path needs no credentials
    async sync(): Promise<SyncResult> {
      return { ingested: 0, skipped: 0, error: 'NOT_CONFIGURED: no API access; import your data-export file (POST /api/connectors/import)' };
    },
  };
}

export const linkedinConnector = exportConnector({
  id: 'linkedin',
  label: 'LinkedIn',
  setupHint: 'No free API. Request your data archive (Settings > Data privacy > Get a copy of your data) and import the zip or Shares.csv.',
});
export const twitterConnector = exportConnector({
  id: 'twitter',
  label: 'X / Twitter',
  setupHint: 'No free API. Request your archive (Settings > Your account > Download an archive) and import the zip or tweets.js.',
});
