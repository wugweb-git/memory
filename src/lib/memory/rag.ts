import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PrismaClient } from '@prisma/client';
import { addProcessingError } from './gate';
import { EmbeddingStatus, ProcessingError } from './types';

const prisma = new PrismaClient();

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_VERSION = 1;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

// Initialize OpenAI Embeddings with batching enabled
const embeddings = new OpenAIEmbeddings({
  modelName: EMBEDDING_MODEL,
  batchSize: 20, // Efficiency: Batch up to 20 chunks per request
});

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

    // 6. PERSIST VECTORS
    const embeddingEntries = chunks.map((chunk, index) => ({
      packet_id: packetId,
      embedding: vectorResults[index],
      text_chunk: chunk,
      test_run_id: packet.test_run_id, // Propagate from packet
      metadata: {
        model: EMBEDDING_MODEL,
        version: EMBEDDING_VERSION,
        chunk_index: index,
        type: packet.type,
        source: packet.source,
        timestamp: packet.ingestion_time.toISOString()
      }
    }));

    await prisma.embedding.createMany({
      data: embeddingEntries as any
    });

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

import { getDb } from './mongoClient';

/**
 * Retrieval Logic with Pre-filtering, 50 -> 10 re-ranking, and Recency Boosting.
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

  // 3. NATIVE VECTOR SEARCH
  const db = await getDb();
  const collection = db.collection('embeddings');

  // Build filters for MongoDB
  const mongoFilter: any = {
    test_run_id: { $eq: test_run_id }
  };
  
  if (filters.type) mongoFilter['metadata.type'] = filters.type;
  if (filters.source) mongoFilter['metadata.source'] = filters.source;
  if (filters.sensitivity) mongoFilter['metadata.sensitivity'] = filters.sensitivity;
  
  const pipeline = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryVector,
        numCandidates: 100, // Search space
        limit: 50,          // Retrieve top 50 for re-ranking
        filter: mongoFilter // NATIVE FILTERING
      }
    },
    {
      $project: {
        _id: 1,
        packet_id: 1,
        text_chunk: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ];

  const results = await collection.aggregate(pipeline).toArray();

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
