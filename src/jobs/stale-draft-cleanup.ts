import { postgres } from "@/lib/db/postgres";

export async function runStaleDraftCleanupJob() {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const stale = await postgres.outputLog.findMany({
    where: { status: "draft", createdAt: { lt: cutoff } },
    select: { id: true },
    take: 500,
  });

  if (stale.length === 0) return { ok: true, job: "stale-draft-cleanup", archived: 0 };

  await postgres.outputLog.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: "archived" as any },
  });

  return { ok: true, job: "stale-draft-cleanup", archived: stale.length };
}
