import { postgres } from "@/lib/db/postgres";
import { publishOutput } from "@/lib/output/automation";

const MAX_ATTEMPTS = 5;

/** Exponential backoff: 2, 4, 8, 16 minutes between attempts. */
function backoffDate(attempts: number) {
  return new Date(Date.now() + 2 ** attempts * 60_000);
}

/**
 * Processes pending publishing-queue items through the direct publish path
 * (distribution → profile → Sanity mirror; publishOutput is idempotent).
 *
 * Lifecycle: pending → processing → published
 *            pending → processing → scheduled(backoff) → … → dead (DLQ)
 */
export async function runPublishingQueueJob() {
  const pending = await postgres.publishingQueue.findMany({
    where: { status: "pending" },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  let published = 0;
  let duplicates = 0;
  let retried = 0;
  let dead = 0;

  for (const item of pending) {
    // Claim first so a concurrent run can't double-publish the same item.
    const claimed = await postgres.publishingQueue.updateMany({
      where: { id: item.id, status: "pending" },
      data: { status: "processing" },
    });
    if (claimed.count === 0) continue;

    try {
      const result = await publishOutput(item.outputId);
      if (result.mode === 'skipped') throw new Error('profile_publish_failed');

      if (result.mode === 'duplicate') duplicates += 1;
      else published += 1;

      await postgres.publishingQueue.update({
        where: { id: item.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          lastError: result.mode === 'duplicate' ? 'duplicate: already published' : null,
        },
      });
    } catch (error: any) {
      const attempts = item.retryCount + 1;
      const isDead = attempts >= MAX_ATTEMPTS;
      if (isDead) dead += 1;
      else retried += 1;

      await postgres.publishingQueue.update({
        where: { id: item.id },
        data: {
          retryCount: attempts,
          lastError: error?.message ?? "publish_failed",
          // Failed items go back to `scheduled` with a backoff time; the
          // scheduled-publisher promotes them to `pending` when due.
          // After MAX_ATTEMPTS they land in the dead-letter state.
          status: isDead ? "dead" : "scheduled",
          scheduledAt: isDead ? null : backoffDate(attempts),
        },
      });
    }
  }

  return { ok: true, job: "publishing-queue", published, duplicates, retried, dead };
}
