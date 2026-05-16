import { NextRequest, NextResponse } from "next/server";
import { getEvolutionTimeline } from "@/lib/persona/evolution";
import { IDENTITY_CONFIG } from "@/config/identity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || IDENTITY_CONFIG.DEFAULT_USER_ID;
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10));
    const timeline = await getEvolutionTimeline(userId, limit);
    return NextResponse.json({ timeline });
  } catch (err) {
    console.error("[L4] drift GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
