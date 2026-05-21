import { postgres } from "@/lib/db/postgres";

export async function runEngagementFetcher() {
  const recent = await postgres.publishedOutput.findMany({
    where: { platform: { not: null }, externalId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let captured = 0;
  for (const row of recent) {
    await postgres.externalFeedback.create({
      data: {
        userId: row.userId,
        platform: row.platform,
        externalPostId: row.externalId,
        feedbackType: "engagement_snapshot",
        payload: { fetchedAt: new Date().toISOString(), source: "job:engagement-fetcher" },
      },
    });
    captured += 1;
  }

  return { ok: true, job: "engagement-fetcher", captured };
}
