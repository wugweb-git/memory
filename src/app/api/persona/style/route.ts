import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { IDENTITY_CONFIG } from "@/config/identity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || IDENTITY_CONFIG.DEFAULT_USER_ID;
    const profile = await postgres.personaProfile.findUnique({ where: { userId } });
    return NextResponse.json({
      writingStyle: profile?.writingStyle || {},
      communicationStyle: profile?.communicationStyle || {},
      decisionStyle: profile?.decisionStyle || {},
      confidenceScore: profile?.confidenceScore ?? 0.5,
    });
  } catch (err) {
    console.error("[L4] style GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
