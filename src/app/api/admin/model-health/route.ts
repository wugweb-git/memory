import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [routingDecisions, arbitrationEvents, fusionEvents] = await Promise.all([
      postgres.decisionLog.count().catch(() => 0),
      postgres.executionAuditLog.count({ where: { eventType: { contains: "arbitration", mode: "insensitive" } } }).catch(() => 0),
      postgres.executionAuditLog.count({ where: { eventType: { contains: "fusion", mode: "insensitive" } } }).catch(() => 0),
    ]);
    return NextResponse.json({
      status: "ok",
      routing: routingDecisions > 0 ? "active" : "idle",
      arbitration: arbitrationEvents > 0 ? "active" : "idle",
      fusion: fusionEvents > 0 ? "active" : "idle",
      routingCount: routingDecisions,
      arbitrationCount: arbitrationEvents,
      fusionCount: fusionEvents,
    });
  } catch (err) {
    console.error("[ADMIN] model-health error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}