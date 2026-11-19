import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { postgres as prisma } from '@/lib/db/postgres';
import { Prisma } from '../../generated/postgres';
import { addProcessingError } from './gate';
import { EmbeddingStatus, ProcessingError } from './types';
import { getEmbeddings, embeddingModelName, embedChunksTolerant, isPermanentEmbedFailure, isTransientEmbedFailure, embedRetryDelayMs, MAX_EMBED_ATTEMPTS, assertEmbeddingDimensions } from './embeddings';
import { rerank, rerankConfigFromEnv } from './rerank';

/** pgvector text literal: '[0.1,0.2,…]' — bound as a parameter, cast with ::vector. */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

const EMBEDDING_VERSION = 1;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

// Pluggable provider: OpenRouter → custom OpenAI-compatible → OpenAI.
const embeddings = getEmbeddings();

/**
 * IDENTITY PRISM: RAG PIPELINE (LAYER 1.2)
 * ---------------------------------------
 * Handles semantic chunking, embedding generation, and vector store sync.
 */

/**
 * Chunks content using a semantic boundary-aware strategy.
 * Paragraph -> Sentence -> Token fallback.
 */
export async function chunkContent(content: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
  });

  return splitter.splitText(content);
}

/**
 * Main embedding worker function for a single packet.
 * Implements strict state machine and atomic locking.
 */
export async function processEmbedding(packetId: string) {
  try {
    // 1. ATOMIC LOCK: Only transition if pending
    // Use updateMany with a filter to ensure atomicity in a multi-worker environment
    const lockResult = await prisma.memoryPacket.updateMany({
      where: {
        id: packetId,
        embedding_status: 'pending',
        is_embeddable: true,
      },
      data: { embedding_status: 'processing' }
    });

    if (lockResult.count === 0) {
      console.log(`[RAG] Packet ${packetId} already being processed or not embeddable. Skipping.`);
      return;
    }

    // Refresh packet after lock
    const packet = await prisma.memoryPacket.findUnique({ where: { id: packetId } });
    if (!packet) return;

    // 2. DUAL-GATE: Final sanity check before cost-heavy API call
    if (!packet.is_embeddable || packet.sensitivity === 'restricted') {
      throw new Error('GATED: Packet is sensitive or not embeddable.');
    }

    const contentStr = typeof packet.content === 'string' 
      ? packet.content 
      : JSON.stringify(packet.content);

    if (contentStr.length < 50) {
      throw new Error('LOW_SIGNAL: Content too short for meaningful embedding.');
    }

    // 3. CHUNKING (Small Signal Guard: Skip if very small)
    let chunks: string[] = [];
    if (contentStr.length < 150) {
      chunks = [contentStr];
    } else {
      chunks = await chunkContent(contentStr);
    }
    
    // 4. BATCH EMBEDDING
    const estimatedTokens = Math.ceil(contentStr.length / 4);
    console.log(`[RAG] Generating ${chunks.length} embeddings (~${estimatedTokens} tokens) for packet ${packetId}...`);
    
    // Batch first (one request); on a content-safety rejection, salvage per chunk
    // so one flagged chunk does not fail the whole packet. Throws LLM_UNAVAILABLE
    // for transient errors and CONTENT_MODERATED when every chunk is rejected.
    const vectorResults = await embedChunksTolerant(embeddings, chunks);
    // A wrong-width vector would make the pgvector insert throw an unclassified error; fail it
    // as a permanent DIMENSION_MISMATCH instead so it is not requeued forever.
    assertEmbeddingDimensions(vectorResults);

    // 5. VECTOR STORE SYNC (Delete stale first if any)
    // CRITICAL: Verify packet still exists before writing to prevent orphans
    const finalCheck = await prisma.memoryPacket.findUnique({ where: { id: packetId } });
    if (!finalCheck) {
      console.warn(`[RAG] Packet ${packetId} deleted mid-processing. Aborting vector write.`);
      return;
    }

    await prisma.embedding.deleteMany({ where: { packet_id: packetId } });

    // 6. PERSIST VECTORS — raw SQL because Prisma can't bind pgvector columns.
    // Chunk counts per packet are small, so per-row parameterized inserts are fine.
    // A null vector is a chunk that content-safety rejected during salvage: skip it.
    let stored = 0;
    for (let index = 0; index < chunks.length; index++) {
      const vec = vectorResults[index];
      if (!vec) continue;
      const metadata = JSON.stringify({
        model: embeddingModelName(),
        version: EMBEDDING_VERSION,
        chunk_index: index,
        type: packet.type,
        source: packet.source,
        timestamp: packet.ingestion_time.toISOString(),
      });
      await prisma.$executeRaw`
        INSERT INTO embeddings (id, packet_id, embedding, text_chunk, metadata, test_run_id)
        VALUES (gen_random_uuid(), ${packetId}, ${toVectorLiteral(vec)}::vector,
                ${chunks[index]}, ${metadata}::jsonb, ${packet.test_run_id})
      `;
      stored += 1;
    }
    if (stored === 0) {
      throw new Error('CONTENT_MODERATED: no chunks embedded (all rejected by content-safety screening)');
    }

    // 7. SUCCESS: Move to embedded state
    await prisma.memoryPacket.update({
      where: { id: packetId },
      data: { 
        embedding_status: 'embedded',
        last_updated: new Date()
      }
    });

    console.log(`[RAG] Successfully embedded packet ${packetId}.`);

  } catch (err: any) {
    console.error(`[RAG] Failed to process embedding for ${packetId}:`, err.message);
    
    // Attempt to log failure to the packet
    try {
      const packet = await prisma.memoryPacket.findUnique({ where: { id: packetId } });
      const currentErrors = (packet?.processing_errors as any) || [];
      const updatedErrors = addProcessingError(currentErrors, {
        time: new Date().toISOString(),
        reason: `EMBEDDING_FAILURE: ${err.message}`,
        level: 'error'
      });

      // A provider outage is not the packet's fault: back off and retry (up to MAX_EMBED_ATTEMPTS)
      // instead of stamping it failed and waiting for the daily requeue.
      const attempts = (packet?.attempt_count ?? 0) + 1;
      if (isTransientEmbedFailure(String(err.message)) && attempts < MAX_EMBED_ATTEMPTS) {
        await prisma.memoryPacket.update({
          where: { id: packetId },
          data: {
            embedding_status: 'pending',
            processing_errors: updatedErrors as any,
            attempt_count: attempts,
            retry_classification: 'transient',
            next_retry_at: new Date(Date.now() + embedRetryDelayMs(attempts)),
            last_retried_at: new Date(),
          },
        });
        return;
      }

      await prisma.memoryPacket.update({
        where: { id: packetId },
        data: { 
          embedding_status: 'failed',
          processing_errors: updatedErrors as any,
          last_retried_at: new Date(),
          // Permanent reasons (content/config never changes): content moderation, gating,
          // or a vector-dimension mismatch. Stop the daily requeue retrying these forever.
          ...(isPermanentEmbedFailure(String(err.message)) ? { is_embeddable: false } : {}),
        }
      });
    } catch (logErr) {
      console.error('[RAG] Critical: Could not update failure status in DB.');
    }
  }
}

/**
 * Retrieval: pgvector cosine search (HNSW index `embeddings_embedding_hnsw`) with
 * pre-filtering (type / source / sensitivity, plus public-only visibility), then the
 * top-50 rows are grouped by packet (best chunk score), given a mild recency boost, then
 * re-ranked with MMR for diversity -> top 10. Configurable via RETRIEVAL_MMR (default on),
 * RETRIEVAL_MMR_LAMBDA (0.7), RETRIEVAL_RECENCY_WEIGHT (0.1), RETRIEVAL_RECENCY_HALFLIFE_DAYS (90).
 * `score` stays the raw cosine; `rank_score` is the boosted value used for ordering.
 */
export async function retrieve(query: string, filters: any = {}) {
  // 1. QUERY VALIDATION
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 3) {
    return { results: [], message: 'QUERY_TOO_SHORT' };
  }

  const test_run_id = filters.test_run_id || 'PROD';

  // 2. GENERATE QUERY VECTOR
  const queryVector = await embeddings.embedQuery(cleanQuery);
  const queryVec = toVectorLiteral(queryVector);

  // 3. NATIVE VECTOR SEARCH — cosine distance (<=>); score = 1 - distance,
  // matching Atlas $vectorSearch's higher-is-better semantics.
  const typeFilter = filters.type
    ? Prisma.sql`AND metadata->>'type' = ${filters.type}`
    : Prisma.empty;
  const sourceFilter = filters.source
    ? Prisma.sql`AND metadata->>'source' = ${filters.source}`
    : Prisma.empty;
  const sensitivityFilter = filters.sensitivity
    ? Prisma.sql`AND metadata->>'sensitivity' = ${filters.sensitivity}`
    : Prisma.empty;

  // Visitor-facing callers (/ask) pass publicOnly: only packets the owner has
  // marked is_public may be retrieved. Constant SQL, no interpolated values.
  const visibilityFilter = filters.publicOnly === true
    ? Prisma.sql`AND packet_id IN (SELECT id FROM memory_packets WHERE is_public = true AND sensitivity <> 'restricted')`
    : Prisma.empty;

  // Vectors (~15-25KB of text each) are only needed for MMR diversity; skip them when it is off.
  const rerankCfg = rerankConfigFromEnv();
  const vectorSelect = rerankCfg.mmr ? Prisma.sql`embedding::text` : Prisma.sql`NULL::text`;

  const results = await prisma.$queryRaw<
    Array<{ id: string; packet_id: string; text_chunk: string; metadata: any; score: number; emb: string | null }>
  >(Prisma.sql`
    SELECT id, packet_id, text_chunk, metadata,
           1 - (embedding <=> ${queryVec}::vector) AS score,
           ${vectorSelect} AS emb
    FROM embeddings
    WHERE embedding IS NOT NULL
      AND test_run_id = ${test_run_id}
      ${visibilityFilter}
      ${typeFilter}
      ${sourceFilter}
      ${sensitivityFilter}
    ORDER BY embedding <=> ${queryVec}::vector
    LIMIT 50
  `);

  // 5. CONTEXT ASSEMBLY (group by packet_id; keep the best chunk's score + vector)
  const grouped = new Map<string, any>();
  for (const curr of results) {
    const g = grouped.get(curr.packet_id);
    if (!g) {
      grouped.set(curr.packet_id, {
        packet_id: curr.packet_id,
        context: [curr.text_chunk],
        score: curr.score,
        source: curr.metadata?.source,
        timestamp: curr.metadata?.timestamp,
        vector: parseVector(curr.emb),
      });
    } else {
      g.context.push(curr.text_chunk);
      if (curr.score > g.score) {
        g.score = curr.score;
        g.vector = parseVector(curr.emb);
      }
    }
  }

  // 6. RECENCY BOOST + MMR RE-RANK
  return rerank([...grouped.values()], rerankCfg, 10).map(({ vector, ...hit }) => hit);
}

function parseVector(text: string | null | undefined): number[] | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
