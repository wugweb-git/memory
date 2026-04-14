import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas';
import { getEmbeddingsTransformer, searchArgs } from './openai';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { put } from '@vercel/blob';

/**
 * IDENTITY PRISM: UNIFIED MEMORY ENGINE (V.2.0.26)
 * -----------------------------------------------
 * The Core Guardrails and Ingestion Pipeline for the Digital Twin.
 * Handles dual-layer persistence (Archival Blob + Intelligent Vector).
 */

export type MemoryObject = {
  raw: string;
  sourceType: string;
  sourceOrigin: string;
  metadata: Record<string, any>;
  isPublic?: boolean;
  profileId?: string;
};

export async function anchorToMemory({
  raw,
  sourceType = 'manual',
  sourceOrigin = 'manual',
  metadata = {},
  isPublic = false,
  profileId = 'system'
}: MemoryObject) {
  
  // GUARDRAIL 1: Payload Clamping (Min/Max content checks)
  const cleanedRaw = String(raw).trim();
  if (cleanedRaw.length < 5) {
     throw new Error("LOGIC_ERROR: Insufficient signal density for vectorization.");
  }
  if (cleanedRaw.length > 50000) {
     throw new Error("SYSTEM_ERROR: Payload exceeds memory-buffer capacity.");
  }

  const timestamp = new Date().toISOString();
  
  try {
    // 1. INTELLIGENT LAYER: Vectorize & Cluster in MongoDB Atlas
    const splitter = new CharacterTextSplitter({
      separator: "\n",
      chunkSize: 800,
      chunkOverlap: 80
    });
    
    const chunks = await splitter.splitText(cleanedRaw);
    
    // GUARDRAIL 2: Metadata Sanitization
    const atlasMetadata = chunks.map((chunk, i) => ({
      sourceType: String(sourceType),
      sourceOrigin: String(sourceOrigin),
      profileId: String(profileId),
      timestamp,
      isPublic: Boolean(isPublic),
      chunkIndex: i,
      totalChunks: chunks.length,
      ...Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => typeof v !== 'object')
      ) // Flatten and sanitize simple metadata
    }));

    // Perform Vector Indexing
    await MongoDBAtlasVectorSearch.fromTexts(
      chunks,
      atlasMetadata,
      getEmbeddingsTransformer(),
      searchArgs()
    );

    // 2. ARCHIVAL LAYER: Soul Persistence in Vercel Blob
    let blobUrl = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const filename = `prism/soul/${profileId}/${Date.now()}.json`;
      const blobPayload = JSON.stringify({
        raw: cleanedRaw,
        sourceType,
        sourceOrigin,
        metadata,
        timestamp,
        integrity_hash: Buffer.from(cleanedRaw).toString('base64').substring(0, 16)
      });
      
      const { url } = await put(filename, blobPayload, {
        access: 'public',
        addRandomSuffix: true
      });
      blobUrl = url;
    }

    return {
      success: true,
      status: 'SIGNAL_ANCHORED',
      stats: {
        nodeCount: chunks.length,
        timestamp,
        vaultUrl: blobUrl
      }
    };
  } catch (err: any) {
    console.error('SYSTEM_MEMORY_FAILURE:', err);
    throw new Error(`MEMORY_ERROR: ${err.message}`);
  }
}
