import { NextRequest, NextResponse } from "next/server";
import { getEvolutionTimeline } from "@/lib/persona/evolution";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "system_user";
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10));
    const timeline = await getEvolutionTimeline(userId, limit);
    return NextResponse.json({ timeline });
  } catch (err) {
    console.error("[L4] drift GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
