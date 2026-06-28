import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';

export interface RssItem {
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
}

export interface RssPayload {
  feedUrl: string;
  items: RssItem[];
}

/**
 * Ingest RSS feed items into Layer 0 (Blob buffer).
 *
 * Each item becomes its own blob item (so it can be reviewed/promoted/rejected
 * independently). External content → tagged `external`, held for review by
 * default. Returns per-item blob ids.
 */
export async function ingestRss(
  payload: RssPayload,
  opts: { autoPromote?: boolean } = {}
) {
  if (!payload?.feedUrl || !Array.isArray(payload.items)) {
    throw new Error('rss ingestion requires `feedUrl` and `items[]`');
  }

  const results: Array<{ url: string; blob_id: string; promoted: boolean }> = [];

  for (const entry of payload.items) {
    if (!entry?.url) continue;

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
        input_mode: 'imported',
        declared_author: 'external',
        ingestion_path: 'ingest/rss',
        feed_url: payload.feedUrl,
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
    count: results.length,
    items: results,
  };
}
