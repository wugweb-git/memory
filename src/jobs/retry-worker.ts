import { postgres } from "@/lib/db/postgres";

export async function runRetryWorker() {
  const now = new Date();
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

  for (const item of due) {
    processed += 1;
    const attempts = item.retryCount + 1;
    const status = attempts >= 5 ? "dead" : "pending";
    const nextRetryAt = attempts >= 5 ? null : new Date(Date.now() + attempts * 60_000);
    if (status === "pending") requeued += 1;

    await postgres.retryQueue.update({
      where: { id: item.id },
      data: { retryCount: attempts, status, nextRetryAt },
    });
  }

  return { ok: true, job: "retry-worker", processed, requeued };
}
