import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from '@/lib/identity/request';
import { requireAdmin } from '@/lib/security/auth';
import { getEvolutionTimeline } from "@/lib/persona/evolution";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const userId = getRequestUserId(req);
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10));
    const timeline = await getEvolutionTimeline(userId, limit);
    return NextResponse.json({ timeline });
  } catch (err) {
    console.error("[L4] drift GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
