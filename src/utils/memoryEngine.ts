import { PrismaClient } from '@prisma/client';
import { put } from '@vercel/blob';

const prisma = new PrismaClient();

/**
 * IDENTITY PRISM: UNIFIED MEMORY ENGINE (V.3.0.0 - POSTGRES REBOOT)
 * -----------------------------------------------
 * Unified ingestion logic for Layer 1, now fully backed by Supabase Postgres.
 * Removes MongoDB Atlas and unifies with Layer 0 architecture.
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
  
  // GUARDRAIL 1: Payload Clamping
  const cleanedRaw = String(raw).trim();
  if (cleanedRaw.length < 5) {
     throw new Error("LOGIC_ERROR: Insufficient signal density for ingestion.");
  }
  if (cleanedRaw.length > 50000) {
     throw new Error("SYSTEM_ERROR: Payload exceeds memory-buffer capacity.");
  }

  const timestamp = new Date();
  
  try {
    // 1. PERSISTENCE LAYER: Supabase Postgres (MemoryPacket)
    // We store the primary content and metadata in the unified Postgres backbone.
    const packet = await prisma.memoryPacket.create({
      data: {
        type: sourceType,
        content: cleanedRaw,
        priority: 'medium',
        status: 'accepted',
        owner_id: profileId,
        metadata: {
          ...metadata,
          source_origin: sourceOrigin,
          is_public: isPublic,
          ingestion_path: 'memory_engine_v3'
        }
      }
    });

    // 2. ARCHIVAL LAYER: Soul Persistence in Vercel Blob (Optional but kept for parity)
    let blobUrl = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const filename = `prism/soul/${profileId}/${Date.now()}.json`;
      const blobPayload = JSON.stringify({
        id: packet.id,
        raw: cleanedRaw,
        sourceType,
        sourceOrigin,
        metadata,
        timestamp: timestamp.toISOString(),
        integrity_hash: Buffer.from(cleanedRaw).toString('base64').substring(0, 16)
      });
      
      const { url } = await put(filename, blobPayload, {
        access: 'public',
        addRandomSuffix: true
      });
      blobUrl = url;

      // Update packet with blob reference
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          metadata: {
            ...(packet.metadata as any),
            blob_url: blobUrl
          }
        }
      });
    }

    // 3. ACTIVITY STREAM
    await prisma.activityStream.create({
      data: {
        event: 'SIGNAL_ANCHORED',
        target: packet.id,
        timestamp
      }
    });

    return {
      success: true,
      status: 'SIGNAL_ANCHORED',
      stats: {
        id: packet.id,
        timestamp: timestamp.toISOString(),
        vaultUrl: blobUrl
      }
    };
  } catch (err: any) {
    console.error('SYSTEM_MEMORY_FAILURE:', err);
    throw new Error(`MEMORY_ERROR: ${err.message}`);
  }
}
