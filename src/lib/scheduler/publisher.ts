import { getQueue } from "@/lib/queue/publishing";

export async function getDueQueueItems(now = new Date()) {
  const items = await getQueue("scheduled");
  return items.filter((i: any) => !i.scheduledAt || new Date(i.scheduledAt) <= now);
}
