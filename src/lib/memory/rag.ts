import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { postgres as prisma } from '@/lib/db/postgres';
import { Prisma } from '../../generated/postgres';
import { addProcessingError } from './gate';
import { EmbeddingStatus, ProcessingError } from './types';
import { getEmbeddings } from './embeddings';

/** pgvector text literal: '[0.1,0.2,…]' — bound as a parameter, cast with ::vector. */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

const EMBEDDING_MODEL = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';
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
    
    let vectorResults;
    try {
      vectorResults = await embeddings.embedDocuments(chunks);
    } catch (apiErr: any) {
      console.error(`[RAG] OpenAI Embedding Failure:`, apiErr.message);
      throw new Error(`LLM_UNAVAILABLE: ${apiErr.message}`);
    }

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
    for (let index = 0; index < chunks.length; index++) {
      const metadata = JSON.stringify({
        model: EMBEDDING_MODEL,
        version: EMBEDDING_VERSION,
        chunk_index: index,
        type: packet.type,
        source: packet.source,
        timestamp: packet.ingestion_time.toISOString(),
      });
      await prisma.$executeRaw`
        INSERT INTO embeddings (id, packet_id, embedding, text_chunk, metadata, test_run_id)
        VALUES (gen_random_uuid(), ${packetId}, ${toVectorLiteral(vectorResults[index])}::vector,
                ${chunks[index]}, ${metadata}::jsonb, ${packet.test_run_id})
      `;
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

      await prisma.memoryPacket.update({
        where: { id: packetId },
        data: { 
          embedding_status: 'failed',
          processing_errors: updatedErrors as any
        }
      });
    } catch (logErr) {
      console.error('[RAG] Critical: Could not update failure status in DB.');
    }
  }
}

/**
 * Retrieval Logic with Pre-filtering, 50 -> 10 re-ranking, and Recency Boosting.
 * pgvector cosine search (HNSW index `embeddings_embedding_hnsw`).
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

  const results = await prisma.$queryRaw<
    Array<{ id: string; packet_id: string; text_chunk: string; metadata: any; score: number }>
  >(Prisma.sql`
    SELECT id, packet_id, text_chunk, metadata,
           1 - (embedding <=> ${queryVec}::vector) AS score
    FROM embeddings
    WHERE embedding IS NOT NULL
      AND test_run_id = ${test_run_id}
      ${typeFilter}
      ${sourceFilter}
      ${sensitivityFilter}
    ORDER BY embedding <=> ${queryVec}::vector
    LIMIT 50
  `);

  // 5. CONTEXT ASSEMBLY (Group by packet_id)
  const grouped = results.reduce((acc: any, curr: any) => {
    if (!acc[curr.packet_id]) {
      acc[curr.packet_id] = {
        packet_id: curr.packet_id,
        context: [curr.text_chunk],
        score: curr.score,
        source: curr.metadata?.source,
        timestamp: curr.metadata?.timestamp
      };
    } else {
      acc[curr.packet_id].context.push(curr.text_chunk);
      acc[curr.packet_id].score = Math.max(acc[curr.packet_id].score, curr.score);
    }
    return acc;
  }, {});

  const assembled = Object.values(grouped).sort((a: any, b: any) => b.score - a.score);

  return assembled.slice(0, 10);
}
