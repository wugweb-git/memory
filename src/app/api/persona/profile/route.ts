import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "system_user";
    const profile = await postgres.personaProfile.findUnique({ where: { userId } });
    return NextResponse.json(profile || { userId, confidenceScore: 0.5 });
  } catch (err) {
    console.error("[L4] profile GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
