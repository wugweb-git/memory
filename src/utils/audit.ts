import { OpenAIEmbeddings } from '@langchain/openai';
import { postgres } from '@/lib/db/postgres';

/**
 * IDENTITY PRISM: MEMORY AUDIT (v4.3 — Neon)
 * ------------------------------------------
 * Validates the integrity of the unified memory store (Neon/Postgres + pgvector).
 */

export async function runMemoryAudit() {
  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    sectors: {}
  };

  try {
    // Sector 1: Database connectivity (Neon)
    try {
      await postgres.$queryRaw`SELECT 1`;
      report.sectors.database = { status: 'ONLINE', provider: 'Neon/Postgres' };
    } catch (e: any) {
      report.sectors.database = { status: 'FAIL', error: e.message };
    }

    // Sector 2: OpenAI / Vector Handshake
    try {
      const transformer = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
      await transformer.embedQuery('Health Check');
      report.sectors.vector_engine = { status: 'SYNCHRONIZED', provider: 'OpenAI' };
    } catch (e: any) {
      report.sectors.vector_engine = { status: 'FAIL', error: e.message };
    }

    // Sector 3: Vector index (pgvector)
    try {
      const idx = await postgres.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes WHERE indexname = 'embeddings_embedding_hnsw'
      `;
      report.sectors.vector_index = idx.length
        ? { status: 'ACTIVE', index: 'hnsw (cosine)' }
        : { status: 'MISSING', note: 'HNSW index not found on embeddings' };
    } catch (e: any) {
      report.sectors.vector_index = { status: 'FAIL', error: e.message };
    }

    // Sector 4: Vercel Blob Connectivity
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      report.sectors.archival_layer = { status: 'ACTIVE', provider: 'Vercel Blob' };
    } else {
      report.sectors.archival_layer = { status: 'LOCAL_ONLY', note: 'Token missing' };
    }

    return {
      success: true,
      report
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      report
    };
  }
}
