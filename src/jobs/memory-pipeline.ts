/**
 * L1 (embedding) / L2 (processing) / L2.5 (semantic) pipeline — HTTP-triggered.
 *
 * This replaces the old `src/lib/memory/scheduler.ts`, which used `node-cron`
 * (`cron.schedule(...)` at module load). That approach cannot work on Vercel:
 * serverless functions are spun up per-request and frozen/killed right after,
 * so in-process timers never fire. It was also never imported anywhere, so it
 * never ran even once. Confirmed in prod: 34/34 memory packets stuck at
 * `embedding_status: 'pending'` forever, 0 ever embedded or processed.
 *
 * Fix: same batch logic, called from a real route (`/api/jobs/process`) that
 * Vercel Cron (or an external trigger) hits every N minutes.
 */
import { postgres as prisma } from '@/lib/db/postgres';
import { processEmbedding } from '@/lib/memory/rag';
import { SettingsController } from '@/lib/memory/settings';
import { ProcessingEngine } from '@/lib/processing/engine';
import { SemanticEngine } from '@/lib/processing/semantic';

function classifyError(err: any): 'transient' | 'permanent' | 'llm_unavailable' {
  const msg = err?.message || '';
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) return 'llm_unavailable';
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('socket') || msg.includes('ECONN')) return 'transient';
  return 'permanent';
}

function getNextRetryAt(retryCount: number): Date {
  const delays = [1 * 60_000, 5 * 60_000, 30 * 60_000, 120 * 60_000];
  const delay = delays[retryCount] || 120 * 60_000;
  return new Date(Date.now() + delay);
}

/** The process route allows 60s; keep the whole pass inside 50s and never start work that cannot finish. */
const PIPELINE_BUDGET_MS = 50_000;
const EMBED_MIN_REMAINING_MS = 12_000;
const SEMANTIC_MIN_REMAINING_MS = 25_000;

/** Clears processing locks stuck for >10 minutes (crashed/timed-out workers). */
export async function clearStaleLocks() {
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
  const cleared = await prisma.memoryPacket.updateMany({
    where: { processing_lock: true, locked_at: { lt: staleThreshold } },
    data: { processing_lock: false, locked_at: null },
  });
  // A worker killed mid-embed leaves the packet in `processing`; hand it back to the queue.
  const stuck = await prisma.memoryPacket.updateMany({
    where: { embedding_status: 'processing', last_updated: { lt: staleThreshold } },
    data: { embedding_status: 'pending' },
  });
  return { cleared: cleared.count, resetProcessing: stuck.count };
}

/** L1 — embeds pending memory packets (priority: fresh > backlog, capped batch). */
export async function runEmbeddingWorker(
  batchSize = process.env.OPENROUTER_API_KEY ? 8 : 20,
  deadline = Infinity,
) {
  const config = await SettingsController.getSettings();
  if (!config.rag_enabled) return { skipped: 'rag_disabled', embedded: 0, failed: 0 };

  const now = new Date();
  const requeued = await requeueStaleFailed(now);

  const targets = await prisma.memoryPacket.findMany({
    where: {
      embedding_status: 'pending',
      status: 'active',
      is_embeddable: true,
      OR: [{ attempt_count: 0 }, { next_retry_at: { lte: now }, attempt_count: { lt: 2 } }],
    },
    orderBy: [{ priority: 'desc' }, { ingestion_time: 'desc' }, { attempt_count: 'asc' }],
    take: batchSize,
  });

  let embedded = 0;
  let failed = 0;
  for (const packet of targets) {
    // Stop starting new packets when the function budget is nearly spent; the rest wait for the next run.
    if (deadline - Date.now() < EMBED_MIN_REMAINING_MS) break;
    try {
      await processEmbedding(packet.id);
      // processEmbedding records its own failures and does not throw; read the outcome back.
      const after = await prisma.memoryPacket.findUnique({
        where: { id: packet.id },
        select: { embedding_status: true },
      });
      if (after?.embedding_status === 'failed') failed += 1;
      else embedded += 1;
    } catch (err: any) {
      failed += 1;
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.attempt_count >= 2;
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          embedding_status: isPermanent ? 'failed' : 'pending',
          retry_classification: type,
          attempt_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.attempt_count),
          last_retried_at: new Date(),
        },
      });
    }
  }
  return { scanned: targets.length, embedded, failed, requeued };
}

/**
 * Packets that exhausted their attempts (e.g. while the embedding provider had no
 * quota) would otherwise stay `failed` forever. Give a few of them a fresh set of
 * attempts at most once per 24h each, so a fixed provider heals old rows without
 * hammering the free-tier cap on genuinely bad packets.
 */
export async function requeueStaleFailed(now: Date, limit = 5): Promise<number> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const stale = await prisma.memoryPacket.findMany({
    where: {
      embedding_status: 'failed',
      status: 'active',
      is_embeddable: true,
      OR: [{ last_retried_at: null }, { last_retried_at: { lt: cutoff } }],
    },
    select: { id: true },
    orderBy: { ingestion_time: 'desc' },
    take: limit,
  });
  if (stale.length === 0) return 0;
  const res = await prisma.memoryPacket.updateMany({
    where: { id: { in: stale.map((p) => p.id) }, embedding_status: 'failed' },
    data: { embedding_status: 'pending', attempt_count: 0, next_retry_at: null, last_retried_at: now },
  });
  return res.count;
}

/** L2 — interpretation processing for packets still pending. */
export async function runL2Processing(batchSize = 50) {
  const now = new Date();
  const targets = await prisma.memoryPacket.findMany({
    where: {
      processing_status: 'pending',
      status: 'active',
      OR: [{ attempt_count: 0 }, { next_retry_at: { lte: now }, attempt_count: { lt: 2 } }],
    },
    orderBy: [{ priority: 'desc' }, { ingestion_time: 'desc' }],
    take: batchSize,
  });

  let completed = 0;
  let failed = 0;
  for (const packet of targets) {
    try {
      await prisma.memoryPacket.update({ where: { id: packet.id }, data: { processing_status: 'processing', locked_at: new Date() } });
      const result = await ProcessingEngine.processPacket(packet.id);
      if (result.success) {
        await prisma.memoryPacket.update({ where: { id: packet.id }, data: { processing_status: 'complete', attempt_count: 0 } });
        completed += 1;
      } else {
        failed += 1;
      }
    } catch (err: any) {
      failed += 1;
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.attempt_count >= 2;
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          processing_status: isPermanent ? 'failed' : 'pending',
          retry_classification: type,
          attempt_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.attempt_count),
          last_retried_at: new Date(),
        },
      });
    }
  }
  return { scanned: targets.length, completed, failed };
}

/** L2.5 — semantic graph extraction for packets that finished L2. */
export async function runL25Processing(batchSize = 20, deadline = Infinity) {
  const config = await SettingsController.getSettings();
  if (!config.semantic_enabled) return { skipped: 'semantic_disabled', completed: 0, failed: 0 };

  const now = new Date();
  const targets = await prisma.memoryPacket.findMany({
    where: {
      processing_status: 'complete',
      semantic_status: { in: ['pending', 'failed'] },
      status: 'active',
      OR: [{ attempt_count: 0 }, { next_retry_at: { lte: now }, attempt_count: { lt: 3 } }],
    },
    orderBy: [{ priority: 'desc' }, { ingestion_time: 'desc' }],
    take: batchSize,
  });

  let completed = 0;
  let failed = 0;
  for (const packet of targets) {
    // One semantic pass can use a full LLM chain budget, so only start one with enough time left.
    if (deadline - Date.now() < SEMANTIC_MIN_REMAINING_MS) break;
    try {
      const result = await SemanticEngine.processSemantic(packet.id, { testRunId: 'PROD' });
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: { semantic_status: result.fallback ? 'partial' : 'complete', attempt_count: 0, retry_classification: null },
      });
      completed += 1;
    } catch (err: any) {
      failed += 1;
      const type = classifyError(err);
      const isPermanent = type === 'permanent' || packet.attempt_count >= 2;
      await prisma.memoryPacket.update({
        where: { id: packet.id },
        data: {
          semantic_status: isPermanent ? 'failed' : 'pending',
          retry_classification: type,
          attempt_count: { increment: 1 },
          next_retry_at: isPermanent ? null : getNextRetryAt(packet.attempt_count),
          last_retried_at: new Date(),
        },
      });
    }
  }
  return { scanned: targets.length, completed, failed };
}

/** Runs the full L1 -> L2 -> L2.5 pass once. Order matters: embedding doesn't
 *  block L2/L2.5 (independent state machines), but running L2 before L2.5 in
 *  the same pass lets a packet flow all the way through in one invocation. */
export async function runMemoryPipeline() {
  const deadline = Date.now() + PIPELINE_BUDGET_MS;
  const locks = await clearStaleLocks();
  const embedding = await runEmbeddingWorker(undefined, deadline);
  const l2 = await runL2Processing();
  const l25 = await runL25Processing(undefined, deadline);
  return { locks, embedding, l2, l25, ranAt: new Date().toISOString() };
}
