import { NextRequest, NextResponse } from "next/server";
import { getUsageToday } from "@/lib/cost/tracking";
import { summarizeBudgets } from "@/lib/cost/guard";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

/** GET — today's per-job OpenRouter usage vs the free-tier daily cap and per-job budgets. Admin only, read-only. */
export async function GET(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "admin:read")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }
  try {
    const usage = await getUsageToday();
    return NextResponse.json({ ...usage, budgets: summarizeBudgets(usage.byJob) });
  } catch (err) {
    console.error("[API/System/Cost] failed:", err);
    return NextResponse.json({ error: "Failed to load cost usage" }, { status: 500 });
  }
}
