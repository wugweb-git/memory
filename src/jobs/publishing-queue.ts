import { postgres } from "@/lib/db/postgres";
import { Prisma } from "@/generated/postgres";

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
      await postgres.publishedOutput.create({
        data: {
          userId: item.userId,
          outputId: item.outputId,
          platform: item.platform,
          externalId: null,
          externalUrl: null,
          publishedContent: Prisma.JsonNull,
          analytics: Prisma.JsonNull,
        },
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
