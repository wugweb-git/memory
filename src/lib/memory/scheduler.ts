import { processEmbedding } from './rag';
import { mongo as prisma } from '@/lib/db/mongo';
// @ts-ignore - node-cron types may be missing in restricted envs
import cron from 'node-cron';
import { SettingsController } from './settings';
import { ProcessingEngine } from '../processing/engine';
import { IntelligenceEngine } from '../processing/intelligence';
import { SemanticEngine } from '../processing/semantic';


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
 * Calculates next retry time using exponential backoff (1m -> 5m -> 30m -> 2h).
 */
function getNextRetryAt(retryCount: number): Date {
  const delays = [
    1 * 60 * 1000,    // 1m
    5 * 60 * 1000,    // 5m
    30 * 60 * 1000,   // 30m
    120 * 60 * 1000   // 2h
  ];
  const delay = delays[retryCount] || (120 * 60 * 1000); // Caps at 2h
  return new Date(Date.now() + delay);
}

// Hourly stale lock cleanup (Security/Safety)
cron.schedule('0 * * * *', async () => {
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 mins
  const cleared = await prisma.memoryPacket.updateMany({
    where: {
      processing_lock: true,
      locked_at: { lt: staleThreshold }
    },
    data: {
      processing_lock: false,
      locked_at: null
    }
  });
  if (cleared.count > 0) {
    console.log(`[Scheduler] Cleared ${cleared.count} stale processing locks.`);
  }
});

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
        { attempt_count: 0 },
        { next_retry_at: { lte: now }, attempt_count: { lt: 2 } }
      ]
    },
    orderBy: [
      { priority: 'desc' },
      { ingestion_time: 'desc' }, // High Priority: Fresh items
      { attempt_count: 'asc' }
    ],
    take: 20
  });

  for (const packet of targetPackets) {
    try {
      await processEmbedding(packet.id);
    } catch (err: any) {
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.attempt_count >= 2; // 3 total attempts
      
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          embedding_status: isPermanent ? 'failed' : 'pending',
          retry_classification: type,
          attempt_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.attempt_count),
          last_retried_at: new Date()
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
        { attempt_count: 0 },
        { next_retry_at: { lte: now }, attempt_count: { lt: 2 } }
      ]
    },
    orderBy: [
      { priority: 'desc' },
      { ingestion_time: 'desc' }
    ],
    take: 50
  });

  for (const packet of l2Targets) {
    try {
      await prisma.memoryPacket.update({ 
        where: { id: packet.id }, 
        data: { processing_status: 'processing', locked_at: new Date() } 
      });
      const result = await ProcessingEngine.processPacket(packet.id);
      if (result.success) {
        await prisma.memoryPacket.update({ 
          where: { id: packet.id }, 
          data: { processing_status: 'complete', attempt_count: 0 } 
        });
      }
    } catch (err: any) {
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.attempt_count >= 2;
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          processing_status: isPermanent ? 'failed' : 'pending',
          retry_classification: type,
          attempt_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.attempt_count),
          last_retried_at: new Date()
        }
      });
    }
  }

  // LAYER 2.5: SEMANTIC
  if (!config.semantic_enabled) return;

  const l25Targets = await prisma.memoryPacket.findMany({
    where: {
      processing_status: 'complete',
      semantic_status: { in: ['pending', 'failed'] },
      status: 'active',
      OR: [
        { attempt_count: 0 },
        { next_retry_at: { lte: now }, attempt_count: { lt: 3 } }
      ]
    },
    orderBy: [
      { priority: 'desc' },
      { ingestion_time: 'desc' }
    ],
    take: 20
  });

  for (const packet of l25Targets) {
    try {
      const result = await SemanticEngine.processSemantic(packet.id, { testRunId: 'PROD' });
      
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: { 
          semantic_status: result.fallback ? 'partial' : 'complete',
          attempt_count: 0,
          retry_classification: null
        }
      });
    } catch (err: any) {
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.attempt_count >= 2;
      
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          semantic_status: isPermanent ? 'failed' : 'pending',
          retry_classification: type,
          attempt_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.attempt_count),
          last_retried_at: new Date()
        }
      });
    }
  }
});

// 3. Periodic Intelligence & Pattern Maintenance (daily at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('[Scheduler] Running deep analysis cycle...');
  try {
    await IntelligenceEngine.scoringEngine();
    await IntelligenceEngine.detectPatterns();
    
    // Cleanup orphan embeddings
    const allEmbeddings = await prisma.embedding.findMany({ select: { packet_id: true } });
    const uniqueIds = Array.from(new Set(allEmbeddings.map(e => e.packet_id)));
    for (const pid of uniqueIds) {
      const exists = await prisma.memoryPacket.findUnique({ where: { id: pid } });
      if (!exists) await prisma.embedding.deleteMany({ where: { packet_id: pid } });
    }
  } catch (err) {
    console.error('[Scheduler] Intelligence cycle failure:', err);
  }
});

// ─── L3 Cognitive Engine — Scheduled Invocations ─────────────────────────────
// Spec: L3.8 Invocation System — scheduled mode (Phase 3 of the L3 build plan)
// Runs AFTER L1/L2/L2.5 are stable so they always operate on fresh context.

// 4. Weekly Direction Reset — architect mode (every Monday at 8:00 AM UTC)
//    Gives every active user a "what to focus on this week" strategic decision.
cron.schedule('0 8 * * 1', async () => {
  console.log('[Scheduler/L3] Running weekly cognitive direction reset (architect mode)...');
  try {
    const { processDecision } = await import('../cognitive');
    const { postgres } = await import('../db/postgres');

    // All users who have ever made a decision — they have context worth reasoning on
    const users = await postgres.decisionLog.findMany({
      distinct: ['userId'],
      select: { userId: true }
    });

    for (const { userId } of users) {
      try {
        await processDecision({ userId, mode: 'architect', external_input: null });
        console.log(`[Scheduler/L3] Weekly direction generated for user ${userId}`);
      } catch (err) {
        // Per-user failure must not stop the batch
        console.error(`[Scheduler/L3] Weekly failed for user ${userId}:`, err);
      }
    }
  } catch (err) {
    console.error('[Scheduler/L3] Weekly cognitive run failed entirely:', err);
  }
});

// 5. Daily Momentum Check — operator mode (every day at 9:00 AM UTC)
//    Lightweight daily summary. Only runs for users active in the last 7 days.
cron.schedule('0 9 * * *', async () => {
  console.log('[Scheduler/L3] Running daily cognitive summary (operator mode)...');
  try {
    const { processDecision } = await import('../cognitive');
    const { postgres } = await import('../db/postgres');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await postgres.decisionLog.findMany({
      distinct: ['userId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { userId: true }
    });

    for (const { userId } of activeUsers) {
      try {
        await processDecision({ userId, mode: 'operator', external_input: null });
      } catch (err) {
        console.error(`[Scheduler/L3] Daily failed for user ${userId}:`, err);
      }
    }
  } catch (err) {
    console.error('[Scheduler/L3] Daily cognitive run failed entirely:', err);
  }
});

console.log('[Scheduler] Brutal Governance Tier initialized (L1, L2, L2.5 adaptive, L3 cognitive weekly + daily).');
