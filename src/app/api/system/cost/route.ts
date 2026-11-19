import { NextRequest, NextResponse } from "next/server";
import { getUsageToday } from "@/lib/cost/tracking";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

/** GET — today's per-job OpenRouter usage vs the free-tier daily cap. Admin only, read-only. */
export async function GET(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "admin:read")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getUsageToday());
  } catch (err) {
    console.error("[API/System/Cost] failed:", err);
    return NextResponse.json({ error: "Failed to load cost usage" }, { status: 500 });
  }
}
