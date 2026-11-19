import { OpenAIEmbeddings } from '@langchain/openai';

/**
 * Embedding provider — pluggable, OpenAI-compatible.
 *
 * Resolution order:
 *   1. OPENROUTER_API_KEY  → https://openrouter.ai/api/v1 (default model
 *      `nvidia/nemotron-3.5-embed-8b:free`, asked for 1536 dims server-side —
 *      matches the pgvector column `embeddings.embedding vector(1536)`).
 *   2. EMBEDDINGS_API_KEY + EMBEDDINGS_BASE_URL → any OpenAI-compatible
 *      endpoint (Jina, Voyage, self-hosted…).
 *   3. OPENAI_API_KEY → api.openai.com directly.
 *
 * IMPORTANT: whatever provider is used must return 1536-dim vectors, or the
 * pgvector column/HNSW index dimension must be migrated to match.
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
/** Legacy fallback model, used only when OPENROUTER_API_KEY is absent (the nemotron slug does not exist on
 *  api.openai.com). text-embedding-3-small supports server-side `dimensions`, so it is also asked for 1536. */
const LEGACY_FALLBACK_MODEL = 'text-embedding-3-small';

export function embeddingsProvider(): { name: string; configured: boolean } {
  if (process.env.OPENROUTER_API_KEY) return { name: 'openrouter', configured: true };
  if (process.env.EMBEDDINGS_API_KEY && process.env.EMBEDDINGS_BASE_URL)
    return { name: 'custom', configured: true };
  if (process.env.OPENAI_API_KEY) return { name: 'openai', configured: true };
  return { name: 'none', configured: false };
}

const OPENROUTER_FREE_EMBED_MODEL = 'nvidia/nemotron-3.5-embed-8b:free';
export const PGVECTOR_DIMENSIONS = 1536;

/** Throws a permanent-classified error if any vector is not the pgvector column width. */
export function assertEmbeddingDimensions(vectors: Array<number[] | null>, expected = PGVECTOR_DIMENSIONS): void {
  for (const v of vectors) {
    if (v && v.length !== expected) {
      throw new Error(`DIMENSION_MISMATCH: embedding has ${v.length} dimensions, expected ${expected} dimensions`);
    }
  }
}

/** Model name actually used for embeddings, for metadata tagging. */
export function embeddingModelName(): string {
  if (process.env.OPENROUTER_API_KEY) return process.env.EMBEDDINGS_MODEL || OPENROUTER_FREE_EMBED_MODEL;
  return process.env.EMBEDDINGS_MODEL || LEGACY_FALLBACK_MODEL;
}

/** EMBEDDINGS_DIMENSIONS is honoured only when it matches the vector(1536) column. */
function embeddingDimensions(): number {
  const n = Number(process.env.EMBEDDINGS_DIMENSIONS);
  return n === PGVECTOR_DIMENSIONS ? n : PGVECTOR_DIMENSIONS;
}

let _instance: OpenAIEmbeddings | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  if (_instance) return _instance;

  if (process.env.OPENROUTER_API_KEY) {
    _instance = new OpenAIEmbeddings({
      apiKey: process.env.OPENROUTER_API_KEY,
      // Free-tier default: the 8B Nemotron embedder, asked for 1536 dims server-side so it
      // fits vector(1536) without a migration. Override with EMBEDDINGS_MODEL.
      modelName: process.env.EMBEDDINGS_MODEL || OPENROUTER_FREE_EMBED_MODEL,
      dimensions: embeddingDimensions(),
      batchSize: 20,
      // Fail fast: the SDK default is 6 retries and a 10 minute timeout, which can eat the whole
      // 60s function on a slow free-tier call. The pipeline retries later on its own schedule.
      timeout: 15_000,
      maxRetries: 0,
      configuration: { baseURL: OPENROUTER_BASE },
    });
  } else if (process.env.EMBEDDINGS_API_KEY && process.env.EMBEDDINGS_BASE_URL) {
    _instance = new OpenAIEmbeddings({
      apiKey: process.env.EMBEDDINGS_API_KEY,
      modelName: process.env.EMBEDDINGS_MODEL || LEGACY_FALLBACK_MODEL,
      dimensions: embeddingDimensions(),
      batchSize: 20,
      configuration: { baseURL: process.env.EMBEDDINGS_BASE_URL },
    });
  } else {
    _instance = new OpenAIEmbeddings({
      modelName: process.env.EMBEDDINGS_MODEL || LEGACY_FALLBACK_MODEL,
      dimensions: embeddingDimensions(),
      batchSize: 20,
    });
  }
  return _instance;
}

/** A 422 / content-safety rejection is deterministic for the same input; anything else
 *  (429, network, 5xx) is a transient provider problem. */
export function isModerationError(msg: string): boolean {
  return /\b422\b|content[-_ ]?safety|moderat|rejected by content/i.test(msg || '');
}

/** A failure that will never succeed on retry for the SAME content/config, so the
 *  packet should be marked is_embeddable=false instead of being requeued forever.
 *  Covers content-moderation / gating reasons AND a vector-dimension mismatch
 *  (the embedder returns a width the pgvector column can't accept — re-running the
 *  same model gives the same width, so the 24h requeue would loop indefinitely). */
export function isPermanentEmbedFailure(msg: string): boolean {
  const m = msg || '';
  return (
    /^(GATED|LOW_SIGNAL|CONTENT_MODERATED)/.test(m) ||
    /DIMENSION_MISMATCH|expected \d+ dimensions|different vector dimensions|dimensions,? not \d+|vector dimension|has \d+ dimensions/i.test(m)
  );
}

type ChunkEmbedder = {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
};

/**
 * Embed a packet's chunks, tolerating per-chunk content-safety rejections.
 * The fast path is one batch call (unchanged cost). Only when the batch is
 * moderation-rejected do we retry chunk by chunk, so one flagged chunk cannot
 * sink a whole packet: good chunks are kept (their vector), rejected chunks are
 * returned as null for the caller to skip. Non-moderation failures (429, network)
 * are re-thrown as LLM_UNAVAILABLE so the pipeline retries later. If every chunk
 * is rejected, throws CONTENT_MODERATED (permanent — the content never changes).
 */
export async function embedChunksTolerant(
  embedder: ChunkEmbedder,
  chunks: string[],
): Promise<(number[] | null)[]> {
  try {
    return await embedder.embedDocuments(chunks);
  } catch (batchErr: any) {
    const bmsg = batchErr?.message || String(batchErr);
    if (!isModerationError(bmsg)) throw new Error(`LLM_UNAVAILABLE: ${bmsg}`);
    const out: (number[] | null)[] = [];
    for (const chunk of chunks) {
      try {
        out.push(await embedder.embedQuery(chunk));
      } catch (chunkErr: any) {
        const cmsg = chunkErr?.message || String(chunkErr);
        if (!isModerationError(cmsg)) throw new Error(`LLM_UNAVAILABLE: ${cmsg}`);
        out.push(null);
      }
    }
    if (!out.some(Boolean)) {
      throw new Error(`CONTENT_MODERATED: all ${chunks.length} chunk(s) rejected by content-safety screening`);
    }
    return out;
  }
}
