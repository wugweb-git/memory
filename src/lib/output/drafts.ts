import { postgres } from "@/lib/db/postgres";

export async function saveDraft(params: { userId: string; decisionId: string; platform: string; content: string }) {
  return postgres.outputLog.create({
    data: {
      userId: params.userId,
      decisionId: params.decisionId,
      platform: params.platform,
      content: params.content,
      status: "draft",
    },
  });
}
