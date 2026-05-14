import { postgres } from "@/lib/db/postgres";

export async function enqueuePublishing(data: { userId: string; outputId: string; platform: string; scheduledAt?: Date | null }) {
  return (postgres as any).publishingQueue.create({
    data: {
      userId: data.userId,
      outputId: data.outputId,
      platform: data.platform,
      status: data.scheduledAt ? "scheduled" : "queued",
      scheduledAt: data.scheduledAt || null,
    },
  });
}

export async function getQueue(status?: string) {
  return (postgres as any).publishingQueue.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: "asc" } });
}
