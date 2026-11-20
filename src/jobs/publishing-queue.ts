import { postgres } from "@/lib/db/postgres";
import { publishOutput } from "@/lib/output/automation";
import { queueOutcomeFor } from "@/lib/publishing/delivery";

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
 *            pending → processing → needs_setup (external platform has no credential)
 * `published` means delivered, handed to the owner (manual) or internal-only;
 * a failed external send is retried with backoff, never marked published.
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
  let needsSetup = 0;

  for (const item of pending) {
    // Claim first so a concurrent run can't double-publish the same item.
    const claimed = await postgres.publishingQueue.updateMany({
      where: { id: item.id, status: "pending" },
      // scheduledAt doubles as the claim time while processing (the table has no
      // updatedAt), so the stale-claim sweeps do not steal live work.
      data: { status: "processing", scheduledAt: new Date() },
    });
    if (claimed.count === 0) continue;

    try {
      const result = await publishOutput(item.outputId);
      if (result.mode === 'skipped') throw new Error('profile_publish_failed');

      const outcome = queueOutcomeFor(result.mode, result.platformResult);
      if (outcome.kind === 'retry') throw new Error(outcome.error); // backoff / dead-letter below
      if (outcome.kind === 'needs_setup') {
        needsSetup += 1;
        await postgres.publishingQueue.update({
          where: { id: item.id },
          data: { status: "needs_setup", lastError: outcome.lastError, scheduledAt: null },
        });
        continue;
      }

      if (result.mode === 'duplicate') duplicates += 1;
      else published += 1;

      await postgres.publishingQueue.update({
        where: { id: item.id },
        data: { status: "published", publishedAt: new Date(), lastError: outcome.lastError },
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

  return { ok: true, job: "publishing-queue", published, duplicates, retried, dead, needsSetup };
}
