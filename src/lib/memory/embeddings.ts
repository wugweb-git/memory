import { OpenAIEmbeddings } from '@langchain/openai';

/**
 * Embedding provider — pluggable, OpenAI-compatible.
 *
 * Resolution order:
 *   1. OPENROUTER_API_KEY  → https://openrouter.ai/api/v1 (model
 *      `openai/text-embedding-3-small`, 1536 dims — matches the pgvector
 *      column `embeddings.embedding vector(1536)`).
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

let _instance: OpenAIEmbeddings | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  if (_instance) return _instance;

  if (process.env.OPENROUTER_API_KEY) {
    _instance = new OpenAIEmbeddings({
      apiKey: process.env.OPENROUTER_API_KEY,
      modelName: process.env.EMBEDDINGS_MODEL || `openai/${DEFAULT_MODEL}`,
      batchSize: 20,
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
