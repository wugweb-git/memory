import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from '@/lib/identity/request';
import { requireAdmin } from '@/lib/security/auth';
import { getEvolutionTimeline } from "@/lib/persona/evolution";
import { analyzePersonaDrift } from "@/lib/persona/drift";
import { clampLimit } from "@/lib/validation/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const userId = getRequestUserId(req);
    const limit = clampLimit(req.nextUrl.searchParams.get("limit"), 20, 50);
    const [timeline, drift] = await Promise.all([
      getEvolutionTimeline(userId, limit),
      analyzePersonaDrift(userId),
    ]);
    return NextResponse.json({ drift, timeline });
  } catch (err) {
    console.error("[L4] drift GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
