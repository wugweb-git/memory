import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';
import { fetchUrl, extractArticle } from './fetchers';

export interface ArticlePayload {
  url: string;
  title?: string;
  content?: string;
}

/**
 * Ingest an external article/web page into Layer 0 (Blob buffer).
 *
 * When no `content` is supplied, the URL is fetched server-side and the
 * readable text extracted. A fetch failure never loses the capture — the
 * URL-only blob is stored with the error recorded in its trace.
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

  let title = payload.title ?? null;
  let content = payload.content ?? null;
  let fetched = false;
  let fetchError: string | null = null;

  if (!content) {
    try {
      const html = await fetchUrl(payload.url);
      const extracted = extractArticle(html);
      content = extracted.text || null;
      title = title ?? extracted.title;
      fetched = true;
    } catch (err: any) {
      fetchError = err?.message ?? 'fetch failed';
    }
  }

  const item = await Push_To_Blob({
    type: 'article',
    source: 'article',
    source_id: payload.url,
    raw_payload: {
      url: payload.url,
      title,
      content,
    },
    trace_json: {
      origin: 'article',
      input_mode: fetched ? 'fetched' : 'imported',
      declared_author: 'external',
      ingestion_path: 'ingest/article',
      fetched,
      ...(fetchError ? { fetch_error: fetchError } : {}),
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
    fetched,
    ...(fetchError ? { fetch_error: fetchError } : {}),
    title,
    content_chars: content?.length ?? 0,
    promoted: Boolean(promotedPacketId),
    memory_packet_id: promotedPacketId,
  };
}
