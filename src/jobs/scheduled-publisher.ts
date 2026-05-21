import { postgres } from "@/lib/db/postgres";

export async function runScheduledPublisher() {
  const now = new Date();
  const ready = await postgres.publishingQueue.findMany({
    where: {
      status: { in: ["queued", "scheduled", "pending"] },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    take: 50,
  });

  if (ready.length === 0) return { ok: true, job: "scheduled-publisher", processed: 0 };

  const ids = ready.map((r) => r.id);
  await postgres.publishingQueue.updateMany({
    where: { id: { in: ids } },
    data: { status: "pending" },
  });

  return { ok: true, job: "scheduled-publisher", processed: ids.length };
}
