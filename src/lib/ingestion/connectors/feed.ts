/**
 * Shared feed → blob sync used by every RSS/Atom-backed connector
 * (GitHub, YouTube, blog/Medium/Substack). Fetches, parses, dedupes against
 * the connector's rolling `seen` window, and writes one blob item per new
 * entry. External content is tagged `external` and held for review.
 */

import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';
import { detectAiLikelihood, detectProvenanceSignal } from '@/lib/provenance/detection';
import { fetchUrl, parseFeed } from '../fetchers';
import { getConnectorState, saveConnectorState } from './state';
import type { SyncResult } from './types';

const MAX_ITEMS = 25;

export interface FeedSyncConfig {
  connectorId: string;
  /** Blob `source` tag (e.g. 'github', 'youtube', 'blog'). */
  source: string;
  feedUrl: string;
}

export async function syncFeed(
  cfg: FeedSyncConfig,
  opts: { autoPromote?: boolean } = {},
): Promise<SyncResult> {
  const state = await getConnectorState(cfg.connectorId);

  let items;
  try {
    const xml = await fetchUrl(cfg.feedUrl);
    items = parseFeed(xml).slice(0, MAX_ITEMS);
  } catch (err: any) {
    const error = `fetch/parse: ${err?.message ?? String(err)}`;
    await saveConnectorState(cfg.connectorId, {
      ...state,
      lastSyncAt: new Date().toISOString(),
      lastError: error,
    });
    return { ingested: 0, skipped: 0, error };
  }

  const seen = new Set(state.seen);
  const newlySeen: string[] = [];
  let ingested = 0;
  let skipped = 0;

  for (const entry of items) {
    if (!entry.url) {
      skipped++;
      continue;
    }
    if (seen.has(entry.url)) {
      skipped++;
      continue;
    }

    let provenance: ReturnType<typeof detectProvenanceSignal> | null = null;
    if (entry.summary && entry.summary.length >= 40) {
      const { aiProbability, humanProbability } = detectAiLikelihood(entry.summary);
      provenance = detectProvenanceSignal({ aiProbability, humanProbability, verifiedHuman: false });
    }

    const item = await Push_To_Blob({
      type: cfg.source,
      source: cfg.source,
      source_id: entry.url,
      raw_payload: {
        feed_url: cfg.feedUrl,
        title: entry.title ?? null,
        url: entry.url,
        summary: entry.summary ?? null,
        published_at: entry.publishedAt ?? null,
      },
      trace_json: {
        origin: cfg.source,
        input_mode: 'synced',
        declared_author: 'external',
        ingestion_path: `connector/${cfg.connectorId}`,
        feed_url: cfg.feedUrl,
        ...(provenance ? { provenance } : {}),
        received_at: new Date().toISOString(),
      },
    });

    if (opts.autoPromote && item?.id) {
      // Best-effort — a promotion failure shouldn't lose the buffered item.
      try {
        await Promote_To_Memory(item.id);
      } catch {
        /* keep it review-first in the buffer */
      }
    }

    seen.add(entry.url);
    newlySeen.push(entry.url);
    ingested++;
  }

  await saveConnectorState(cfg.connectorId, {
    lastSyncAt: new Date().toISOString(),
    lastError: null,
    lastResult: { ingested, skipped, scanned: items.length },
    seen: [...state.seen, ...newlySeen],
  });

  return { ingested, skipped, scanned: items.length };
}
