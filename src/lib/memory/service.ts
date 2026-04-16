import prisma from '@/lib/prisma';
import { ingestionGate, generateHash, addProcessingError } from './gate';
import { normalize } from './normalization';
import { shouldFilter } from './noise-filter';
import { MemoryPacket, ProcessingError, EmbeddingStatus } from './types';
import { encrypt, isEncryptionConfigured } from './encryption';

export class MemoryService {
  /**
   * Main ingestion entry point. NO raw data bypasses this.
   */
  static async ingest(raw: any, userId: string): Promise<any> {
    const errors: ProcessingError[] = [];

    try {
      // 1. Resolve Source
      const sourceName = (raw.source || raw.source_type || 'unknown').toLowerCase();
      let source = await prisma.source.findFirst({
        where: { name: sourceName }
      });

      if (!source) {
        source = await prisma.source.create({
          data: {
            name: sourceName,
            type: 'external',
            trust_score: 0.5,
            priority_level: 'medium'
          }
        });
      }

      // 2. Storage Check
      const storageUsage = 10; // TODO: Implement real usage monitor

      // 3. Ingestion Gate (Loop Prevention + Schema + Trust)
      const gateReport = await ingestionGate(raw, source as any, storageUsage);
      
      if (gateReport.decision !== 'ACCEPT') {
        const log = await prisma.ingestionLog.create({
          data: {
            decision: gateReport.decision,
            reason: gateReport.reason,
            timestamp: new Date(),
            raw_payload: raw
          }
        });
        return { status: gateReport.decision, log_id: log.id, reason: gateReport.reason };
      }

      // 4. Normalization
      const packetData = normalize(raw, userId);
      
      // 5. Deduplication (Hash-based)
      packetData.hash = generateHash(packetData);
      const existing = await prisma.memoryPacket.findUnique({
        where: { hash: packetData.hash }
      });

      if (existing) {
        return { status: 'IGNORE', reason: 'DUPLICATE_HASH', packet_id: existing.id };
      }

      // 6. Noise Filtering
      const filterReport = shouldFilter(packetData);
      if (filterReport.filtered) {
        return { status: 'FILTERED', reason: filterReport.reason };
      }

      // 7. Encryption Logic (Structured)
      if (packetData.sensitivity === 'restricted') {
        if (!isEncryptionConfigured()) {
          const encError: ProcessingError = {
            time: new Date().toISOString(),
            reason: 'ENCRYPTION_KEY_MISSING_FOR_RESTRICTED_DATA',
            level: 'critical'
          };
          throw new Error('REJECT: Encryption key missing for restricted payload.');
        }
        
        const contentStr = typeof packetData.content === 'string' 
          ? packetData.content 
          : JSON.stringify(packetData.content);
        
        const encryptedRes = encrypt(contentStr);
        packetData.content = { _encrypted: true, ...encryptedRes };
      }

      // 8. Storage (WRITE LOCK: embedding_status is ALWAYS pending at ingestion)
      const packet = await prisma.memoryPacket.create({
        data: {
          ...packetData,
          event_time: new Date(packetData.timestamps.event_time),
          content: packetData.content as any,
          metadata: packetData.metadata as any,
          trace: packetData.trace as any,
          embedding_status: 'pending', // FORCED: ONLY rag.ts can change this later
          processing_errors: packetData.processing_errors as any
        } as any
      });

      return { status: 'ACCEPTED', packet_id: packet.id };

    } catch (err: any) {
      const finalError: ProcessingError = {
        time: new Date().toISOString(),
        reason: err.message || 'UNKNOWN_INGESTION_ERROR',
        level: 'error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      };
      
      // Persist error for visibility if possible
      console.error('INGESTION_FAILURE:', finalError);
      
      return { 
        status: 'FAILED', 
        reason: err.message, 
        error_details: finalError 
      };
    }
  }

  /**
   * Safe state transition for embedding_status.
   * Only to be called by the RAG services.
   */
  static async updateEmbeddingStatus(packetId: string, status: EmbeddingStatus, error?: string) {
    const packet = await prisma.memoryPacket.findUnique({ where: { id: packetId } });
    if (!packet) return;

    const currentErrors = (packet.processing_errors as any) || [];
    const newErrors = error 
      ? addProcessingError(currentErrors, { time: new Date().toISOString(), reason: error, level: 'error' })
      : currentErrors;

    return prisma.memoryPacket.update({
      where: { id: packetId },
      data: { 
        embedding_status: status,
        processing_errors: newErrors as any
      }
    });
  }

  /**
   * ATOMIC UPDATE: Synchronizes RAG lifecycle on content change.
   */
  static async updatePacket(packetId: string, updates: Partial<MemoryPacket>) {
    const packet = await prisma.memoryPacket.findUnique({ where: { id: packetId } });
    if (!packet) throw new Error('NOT_FOUND: Packet does not exist.');

    // If content changes, we MUST re-embed
    const contentChanged = updates.content && JSON.stringify(updates.content) !== JSON.stringify(packet.content);
    
    return prisma.memoryPacket.update({
      where: { id: packetId },
      data: {
        ...updates,
        embedding_status: contentChanged ? 'pending' : packet.embedding_status,
        last_updated: new Date()
      } as any
    });
  }

  /**
   * ATOMIC DELETE: Full cascading cleanup of memory, vectors, and activity.
   */
  static async deletePacket(packetId: string) {
    return prisma.$transaction([
      prisma.embedding.deleteMany({ where: { packet_id: packetId } }),
      prisma.activityStream.deleteMany({ where: { packet_id: packetId } }),
      prisma.retryQueue.deleteMany({ where: { packet_id: packetId } }),
      prisma.memoryPacket.delete({ where: { id: packetId } })
    ]);
  }
}
