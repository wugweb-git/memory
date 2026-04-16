import { processEmbedding } from './rag';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { SettingsController } from './settings';
import { ProcessingEngine } from '../processing/engine';
import { IntelligenceEngine } from '../processing/intelligence';
import { SemanticEngine } from '../processing/semantic';

const prisma = new PrismaClient();

/**
 * Classifies an error into retryable categories.
 */
function classifyError(err: any): 'transient' | 'permanent' | 'llm_unavailable' {
  const msg = err.message || '';
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) return 'llm_unavailable';
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('socket') || msg.includes('ECONN')) return 'transient';
  return 'permanent';
}

/**
 * Calculates next retry time using exponential backoff (5m -> 30m).
 */
function getNextRetryAt(retryCount: number): Date {
  const delays = [5 * 60 * 1000, 30 * 60 * 1000];
  const delay = delays[retryCount] || (30 * 60 * 1000);
  return new Date(Date.now() + delay);
}

// 1. RAG Embedding Worker (Priority: Fresh > Recent > Backlog)
cron.schedule('*/1 * * * *', async () => {
  const config = await SettingsController.getSettings();
  if (!config.rag_enabled) return;

  const now = new Date();
  
  // Priority 1: Fresh pending items (<1h)
  // Priority 2: Retries whose backoff has expired
  const targetPackets = await prisma.memoryPacket.findMany({
    where: {
      embedding_status: 'pending',
      status: 'active',
      is_embeddable: true,
      OR: [
        { retry_count: 0 },
        { next_retry_at: { lte: now }, retry_count: { lt: 2 } }
      ]
    },
    orderBy: [
      { ingestion_time: 'desc' }, // High Priority: Fresh items
      { retry_count: 'asc' }
    ],
    take: 20
  });

  for (const packet of targetPackets) {
    try {
      await processEmbedding(packet.id);
    } catch (err: any) {
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.retry_count >= 1; // 2nd attempt fail = permanent if not transient
      
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          embedding_status: isPermanent ? 'failed' : 'pending',
          error_type: type,
          retry_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.retry_count),
          last_attempt_at: new Date()
        }
      });
    }
  }
});

// 2. Layer 2 & 2.5 Processing (Adaptive Governance)
cron.schedule('*/2 * * * *', async () => {
  const config = await SettingsController.getSettings();
  const now = new Date();

  // LAYER 2: INTERPRETATION
  const l2Targets = await prisma.memoryPacket.findMany({
    where: {
      processing_status: 'pending',
      status: 'active',
      OR: [
        { retry_count: 0 },
        { next_retry_at: { lte: now }, retry_count: { lt: 2 } }
      ]
    },
    orderBy: { ingestion_time: 'desc' },
    take: 50
  });

  for (const packet of l2Targets) {
    try {
      await prisma.memoryPacket.update({ where: { id: packet.id }, data: { processing_status: 'processing' } });
      const result = await ProcessingEngine.processPacket(packet.id);
      if (result.success) {
        await prisma.memoryPacket.update({ where: { id: packet.id }, data: { processing_status: 'completed', retry_count: 0 } });
      }
    } catch (err: any) {
      const type = classifyError(err);
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          processing_status: (type === 'permanent' || packet.retry_count >= 1) ? 'failed' : 'pending',
          error_type: type,
          retry_count: { increment: 1 },
          next_retry_at: getNextRetryAt(packet.retry_count),
          last_attempt_at: new Date()
        }
      });
    }
  }

  // LAYER 2.5: SEMANTIC
  if (!config.semantic_enabled) return;

  const l25Targets = await prisma.memoryPacket.findMany({
    where: {
      processing_status: 'completed',
      semantic_status: { in: ['pending', 'failed'] }, // Include failed for retries
      status: 'active',
      OR: [
        { retry_count: 0 },
        { next_retry_at: { lte: now }, retry_count: { lt: 2 } }
      ]
    },
    orderBy: { ingestion_time: 'desc' },
    take: 20
  });

  for (const packet of l25Targets) {
    try {
      await prisma.memoryPacket.update({ where: { id: packet.id }, data: { semantic_status: 'processing' } });
      const result = await SemanticEngine.processSemantic(packet.id);
      
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: { 
          semantic_status: result.fallback ? 'partial' : 'completed',
          retry_count: 0,
          error_type: null
        }
      });
    } catch (err: any) {
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.retry_count >= 1;
      
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          semantic_status: isPermanent ? 'failed' : 'pending',
          error_type: type,
          retry_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.retry_count),
          last_attempt_at: new Date()
        }
      });
    }
  }
});

// 3. Periodic Intelligence & Pattern Maintenance
cron.schedule('0 0 * * *', async () => {
  console.log('[Scheduler] Running deep analysis cycle...');
  try {
    await IntelligenceEngine.scoringEngine();
    await IntelligenceEngine.detectPatterns();
    
    // Cleanup orphans
    const allEmbeddings = await prisma.embedding.findMany({ select: { packet_id: true } });
    const uniqueIds = [...new Set(allEmbeddings.map(e => e.packet_id))];
    for (const pid of uniqueIds) {
      const exists = await prisma.memoryPacket.findUnique({ where: { id: pid } });
      if (!exists) await prisma.embedding.deleteMany({ where: { packet_id: pid } });
    }
  } catch (err) {
    console.error('[Scheduler] Intelligence cycle failure:', err);
  }
});

console.log('[Scheduler] Brutal Governance Tier initialized (L1, L2, L2.5 adaptive).');
