import { postgres } from "@/lib/db/postgres";
import { publishContentToProfile } from "@/lib/profile/store";
import { IDENTITY_CONFIG } from "@/config/identity";

export async function runPublishingQueueJob() {
  const pending = await postgres.publishingQueue.findMany({
    where: { status: "pending" },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  let published = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await postgres.publishingQueue.update({
        where: { id: item.id },
        data: { status: "published", publishedAt: new Date(), lastError: null },
      });
      await publishContentToProfile({
        username: IDENTITY_CONFIG.HANDLE,
        userId: item.userId,
        outputId: item.outputId,
        platform: item.platform ?? "portfolio",
      });
      published += 1;
    } catch (error: any) {
      failed += 1;
      await postgres.publishingQueue.update({
        where: { id: item.id },
        data: { status: "failed", lastError: error?.message ?? "publish_failed", retryCount: { increment: 1 } },
      });
    }
  }

  return { ok: true, job: "publishing-queue", published, failed };
}
