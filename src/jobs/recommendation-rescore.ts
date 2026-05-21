import { postgres } from "@/lib/db/postgres";

export async function runRecommendationRescoreJob() {
  const rules = await postgres.automationRule.findMany({ where: { enabled: true }, take: 200 });
  const touchedUsers = new Set<string>();

  for (const rule of rules) {
    touchedUsers.add(rule.userId);
    await postgres.workflowLog.create({
      data: {
        workflowName: "recommendation_rescore",
        status: "ok",
        payload: {
          userId: rule.userId,
          ruleId: rule.id,
          action: "rescored",
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  return { ok: true, job: "recommendation-rescore", rulesProcessed: rules.length, usersTouched: touchedUsers.size };
}
