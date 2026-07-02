import { postgres } from "@/lib/db/postgres";

const STALE_PROCESSING_MS = 10 * 60_000;

/** Promotes due queue items to `pending` for the publishing-queue job, and
 *  reclaims items stuck in `processing` (e.g. a run died mid-publish). */
export async function runScheduledPublisher() {
  const now = new Date();

  // Reclaim stale `processing` items — publishOutput is idempotent, so
  // re-running a half-published item cannot double-publish.
  const reclaimed = await postgres.publishingQueue.updateMany({
    where: {
      status: "processing",
      createdAt: { lte: new Date(Date.now() - STALE_PROCESSING_MS) },
    },
    data: { status: "pending" },
  });

  const ready = await postgres.publishingQueue.findMany({
    where: {
      status: { in: ["queued", "scheduled"] },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    take: 50,
  });

  if (ready.length > 0) {
    await postgres.publishingQueue.updateMany({
      where: { id: { in: ready.map((r) => r.id) } },
      data: { status: "pending" },
    });
  }

  return { ok: true, job: "scheduled-publisher", processed: ready.length, reclaimed: reclaimed.count };
}
