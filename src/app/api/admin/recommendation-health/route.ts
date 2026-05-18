import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rulesEnabled, rulesTotal, workflowLogs, externalFeedback] = await Promise.all([
      postgres.automationRule.count({ where: { enabled: true } }).catch(() => 0),
      postgres.automationRule.count().catch(() => 0),
      postgres.workflowLog.count({ where: { workflowName: { contains: "recommend", mode: "insensitive" } } }).catch(() => 0),
      postgres.externalFeedback.count().catch(() => 0),
    ]);

    return NextResponse.json({
      status: "ok",
      scoring: rulesEnabled > 0 ? "active" : "idle",
      suppression: rulesTotal > 0 ? "active" : "idle",
      timing: workflowLogs > 0 ? "active" : "idle",
      fatigue: externalFeedback > 0 ? "active" : "idle",
      metrics: {
        rulesEnabled,
        rulesTotal,
        recommendationWorkflowLogs: workflowLogs,
        externalFeedback,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ADMIN] recommendation-health error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
