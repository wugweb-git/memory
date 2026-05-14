import { postgres } from "@/lib/db/postgres";

export async function storeExternalFeedback(data: {
  userId: string;
  platform: string;
  externalPostId: string;
  feedbackType: string;
  payload?: Record<string, unknown>;
}) {
  return (postgres as any).externalFeedback.create({ data });
}
