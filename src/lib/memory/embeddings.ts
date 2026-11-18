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
const DEFAULT_MODEL = 'text-embedding-3-small';

export function embeddingsProvider(): { name: string; configured: boolean } {
  if (process.env.OPENROUTER_API_KEY) return { name: 'openrouter', configured: true };
  if (process.env.EMBEDDINGS_API_KEY && process.env.EMBEDDINGS_BASE_URL)
    return { name: 'custom', configured: true };
  if (process.env.OPENAI_API_KEY) return { name: 'openai', configured: true };
  return { name: 'none', configured: false };
}

const OPENROUTER_FREE_EMBED_MODEL = 'nvidia/nemotron-3.5-embed-8b:free';
const PGVECTOR_DIMENSIONS = 1536;

/** Model name actually used for embeddings, for metadata tagging. */
export function embeddingModelName(): string {
  if (process.env.OPENROUTER_API_KEY) return process.env.EMBEDDINGS_MODEL || OPENROUTER_FREE_EMBED_MODEL;
  return process.env.EMBEDDINGS_MODEL || DEFAULT_MODEL;
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
      modelName: process.env.EMBEDDINGS_MODEL || DEFAULT_MODEL,
      batchSize: 20,
      configuration: { baseURL: process.env.EMBEDDINGS_BASE_URL },
    });
  } else {
    _instance = new OpenAIEmbeddings({
      modelName: process.env.EMBEDDINGS_MODEL || DEFAULT_MODEL,
      batchSize: 20,
    });
  }
  return _instance;
}
