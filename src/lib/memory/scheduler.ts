import { MemoryService } from './service';
import { processEmbedding } from './rag';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

/**
 * IDENTITY PRISM: MEMORY SCHEDULER (LAYER 1 ONLY)
 * ---------------------------------------------
 * Handles background retry logic and system housekeeping for Layer 1.
 * Focused on RAG consistency and storage health.
 */

// 1. Retry Queue Processor (Every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  console.log('[Scheduler] Starting retry_queue sweep...');
  
  const pendingRetries = await prisma.retryQueue.findMany({
    where: {
      status: 'pending',
      next_retry_at: { lte: new Date() }
    },
    take: 50
  });

  for (const retry of pendingRetries) {
    try {
      if (retry.retry_count >= 3) {
        console.warn(`[Scheduler] Packet ${retry.packet_id} reached max retries. Moving to DEAD_LETTER.`);
        
        await prisma.retryQueue.update({
          where: { id: retry.id },
          data: { status: 'failed' }
        });

        await prisma.memoryPacket.update({
          where: { id: retry.packet_id },
          data: { 
            status: 'failed',
            processing_errors: {
              push: { time: new Date().toISOString(), reason: 'MAX_RETRIES_EXCEEDED', level: 'error' }
            } as any
          }
        });
        continue;
      }

      const nextDelay = Math.pow(2, retry.retry_count) * 60 * 1000;
      await prisma.retryQueue.update({
        where: { id: retry.id },
        data: {
          retry_count: retry.retry_count + 1,
          next_retry_at: new Date(Date.now() + nextDelay),
          last_attempt: new Date()
        }
      });

    } catch (err) {
      console.error(`[Scheduler] Failed to process retry ${retry.id}:`, err);
    }
  }
});

// 2. RAG Embedding Worker (Every 1 minute sweep)
cron.schedule('*/1 * * * *', async () => {
  console.log('[Scheduler] Starting RAG embedding sweep...');
  
  const pendingPackets = await prisma.memoryPacket.findMany({
    where: {
      embedding_status: 'pending',
      is_embeddable: true,
      status: 'active'
    },
    take: 20
  });

  for (const packet of pendingPackets) {
    await processEmbedding(packet.id);
  }
});

// 5. Embedding Consistency & Orphan Cleanup (Every 24 hours)
cron.schedule('0 0 * * *', async () => {
  console.log('[Scheduler] Starting embedding consistency check...');
  
  const allEmbeddings = await prisma.embedding.findMany({ select: { packet_id: true } });
  const uniquePacketIds = [...new Set(allEmbeddings.map(e => e.packet_id))];

  for (const pid of uniquePacketIds) {
    const parent = await prisma.memoryPacket.findUnique({ where: { id: pid } });
    if (!parent) {
      console.warn(`[Scheduler] Orphan embeddings detected for packet ${pid}. Cleaning up...`);
      await prisma.embedding.deleteMany({ where: { packet_id: pid } });
    }
  }
});

console.log('[Scheduler] Layer 1 Memory governance jobs initialized.');
