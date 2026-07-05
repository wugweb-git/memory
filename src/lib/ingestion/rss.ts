import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';
import { fetchUrl, parseFeed } from './fetchers';
import { detectAiLikelihood, detectProvenanceSignal } from '@/lib/provenance/detection';

export interface RssItem {
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
}

export interface RssPayload {
  feedUrl: string;
  /** Optional pre-parsed items. When omitted, the feed is fetched + parsed. */
  items?: RssItem[];
}

const MAX_FEED_ITEMS = 20;

/**
 * Ingest RSS/Atom feed items into Layer 0 (Blob buffer).
 *
 * With only a `feedUrl`, the feed is fetched and parsed server-side
 * (RSS 2.0 + Atom). Each item becomes its own blob item (so it can be
 * reviewed/promoted/rejected independently). External content → tagged
 * `external`, held for review by default. Returns per-item blob ids.
 */
export async function ingestRss(
  payload: RssPayload,
  opts: { autoPromote?: boolean } = {}
) {
  if (!payload?.feedUrl) {
    throw new Error('rss ingestion requires `feedUrl`');
  }

  let items = Array.isArray(payload.items) ? payload.items : null;
  let fetched = false;
  if (!items) {
    const xml = await fetchUrl(payload.feedUrl);
    items = parseFeed(xml).slice(0, MAX_FEED_ITEMS);
    fetched = true;
    if (items.length === 0) {
      throw new Error('Feed fetched but no items could be parsed (RSS 2.0/Atom expected)');
    }
  }

  const results: Array<{ url: string; blob_id: string; promoted: boolean }> = [];

  for (const entry of items) {
    if (!entry?.url) continue;

    let provenance: ReturnType<typeof detectProvenanceSignal> | null = null;
    if (entry.summary && entry.summary.length >= 40) {
      const { aiProbability, humanProbability } = detectAiLikelihood(entry.summary);
      provenance = detectProvenanceSignal({ aiProbability, humanProbability, verifiedHuman: false });
    }

    const item = await Push_To_Blob({
      type: 'rss',
      source: 'rss',
      source_id: entry.url,
      raw_payload: {
        feed_url: payload.feedUrl,
        title: entry.title ?? null,
        url: entry.url,
        summary: entry.summary ?? null,
        published_at: entry.publishedAt ?? null,
      },
      trace_json: {
        origin: 'rss',
        input_mode: fetched ? 'fetched' : 'imported',
        declared_author: 'external',
        ingestion_path: 'ingest/rss',
        feed_url: payload.feedUrl,
        ...(provenance ? { provenance } : {}),
        received_at: new Date().toISOString(),
      },
    });

    let promoted = false;
    if (opts.autoPromote) {
      await Promote_To_Memory(item.id);
      promoted = true;
    }

    results.push({ url: entry.url, blob_id: item.id, promoted });
  }

  return {
    source: 'rss',
    accepted: true,
    fetched,
    count: results.length,
    items: results,
  };
}
