type QueueItem = { id: string; platform: string; content: string; status: "queued" | "published" | "failed" };
const queue: QueueItem[] = [];

export function enqueuePublish(item: QueueItem) { queue.push(item); return item; }
export function listQueue() { return queue; }
