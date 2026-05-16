import { NextRequest, NextResponse } from "next/server";
import { getTopTraits } from "@/lib/persona/behavior";
import { IDENTITY_CONFIG } from "@/config/identity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || IDENTITY_CONFIG.DEFAULT_USER_ID;
    const traits = await getTopTraits(userId, 20);
    return NextResponse.json(traits);
  } catch (err) {
    console.error("[L4] traits GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
