import { postgres } from "@/lib/db/postgres";

export async function runAnalyticsSync() {
  const recent = await postgres.publishedOutput.findMany({
    where: { platform: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let updated = 0;
  for (const row of recent) {
    await postgres.publishedOutput.update({
      where: { id: row.id },
      data: {
        analytics: {
          syncedAt: new Date().toISOString(),
          impressions: typeof row.analytics === "object" && row.analytics && "impressions" in (row.analytics as any)
            ? (row.analytics as any).impressions
            : 0,
        },
      },
    });
    updated += 1;
  }

  return { ok: true, job: "analytics-sync", updated };
}
