import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';

export interface ArticlePayload {
  url: string;
  title?: string;
  content?: string;
}

/**
 * Ingest an external article/web page into Layer 0 (Blob buffer).
 *
 * External/scraped content is provenance-tagged `external` and left in the
 * buffer for review by default — it is NOT auto-promoted into memory, and is
 * never trusted for L4 style/behavior learning downstream. Pass
 * `{ autoPromote: true }` only for trusted, owner-curated sources.
 */
export async function ingestExternalArticle(
  payload: ArticlePayload,
  opts: { autoPromote?: boolean } = {}
) {
  if (!payload?.url || typeof payload.url !== 'string') {
    throw new Error('article ingestion requires a `url`');
  }

  const item = await Push_To_Blob({
    type: 'article',
    source: 'article',
    source_id: payload.url,
    raw_payload: {
      url: payload.url,
      title: payload.title ?? null,
      content: payload.content ?? null,
    },
    trace_json: {
      origin: 'article',
      input_mode: 'imported',
      declared_author: 'external',
      ingestion_path: 'ingest/article',
      received_at: new Date().toISOString(),
    },
  });

  let promotedPacketId: string | null = null;
  if (opts.autoPromote) {
    const promoted = await Promote_To_Memory(item.id);
    promotedPacketId = (promoted as any)?.id ?? null;
  }

  return {
    source: 'article',
    accepted: true,
    blob_id: item.id,
    state: item.state,
    promoted: Boolean(promotedPacketId),
    memory_packet_id: promotedPacketId,
  };
}
