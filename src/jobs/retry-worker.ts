import { postgres } from "@/lib/db/postgres";
import { decideRetry } from "@/lib/queue/retry";

/**
 * Retry worker. Two phases:
 *  1. Sweep: publishing_queue rows left in `failed` (or `processing` for too
 *     long, i.e. a crashed run) are registered in retry_queue (queueType
 *     "publishing", refId = publishing_queue.id).
 *  2. Dispatch: due retry_queue rows are re-dispatched with exponential
 *     backoff. For "publishing" that means flipping the queue item back to
 *     `pending`, which the publishing-queue drain (runPublishingQueueJob)
 *     publishes on its next run. After MAX_RETRY_ATTEMPTS the retry row and
 *     the queue item are marked `dead` (dead-letter queue).
 * Unknown queue types have no handler and go straight to `dead` with a reason.
 */
export async function runRetryWorker() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 10 * 60_000);

  // Phase 1: sweep stuck publishing items into the retry queue.
  const stuck = await postgres.publishingQueue.findMany({
    where: {
      OR: [{ status: "failed" }, { status: "processing", createdAt: { lt: staleBefore } }],
    },
    take: 50,
  });
  let swept = 0;
  for (const q of stuck) {
    const existing = await postgres.retryQueue.findFirst({
      where: { queueType: "publishing", refId: q.id, status: { in: ["pending", "failed", "dispatched"] } },
    });
    if (existing) continue;
    await postgres.retryQueue.create({
      data: { queueType: "publishing", refId: q.id, status: "pending", retryCount: q.retryCount, lastError: q.lastError },
    });
    swept += 1;
  }

  // Phase 2: dispatch due retries.
  const due = await postgres.retryQueue.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  let processed = 0;
  let requeued = 0;
  let dead = 0;
  let resolved = 0;

  for (const item of due) {
    processed += 1;
    const decision = decideRetry(item.retryCount, now);

    if (item.queueType !== "publishing") {
      dead += 1;
      await postgres.retryQueue.update({
        where: { id: item.id },
        data: { status: "dead", lastError: `no_handler:${item.queueType}`, nextRetryAt: null },
      });
      continue;
    }

    const target = await postgres.publishingQueue.findUnique({ where: { id: item.refId } });
    if (!target || target.status === "published") {
      resolved += 1;
      await postgres.retryQueue.update({ where: { id: item.id }, data: { status: "done", nextRetryAt: null } });
      continue;
    }

    if (decision.action === "dead") {
      dead += 1;
      await postgres.$transaction([
        postgres.publishingQueue.update({ where: { id: target.id }, data: { status: "dead", retryCount: decision.attempts } }),
        postgres.retryQueue.update({
          where: { id: item.id },
          data: { status: "dead", retryCount: decision.attempts, nextRetryAt: null },
        }),
      ]);
      continue;
    }

    requeued += 1;
    await postgres.$transaction([
      postgres.publishingQueue.update({
        where: { id: target.id },
        data: { status: "pending", retryCount: decision.attempts, scheduledAt: null },
      }),
      postgres.retryQueue.update({
        where: { id: item.id },
        // "dispatched" is not re-picked; if the drain fails again it manages
        // backoff/DLQ itself, and a later failed/stuck state is re-swept.
        data: { status: "dispatched", retryCount: decision.attempts, nextRetryAt: decision.nextRetryAt },
      }),
    ]);
  }

  return { ok: true, job: "retry-worker", swept, processed, requeued, dead, resolved };
}
