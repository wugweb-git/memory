import { NextRequest, NextResponse } from "next/server";
import { generateRecommendations } from "@/lib/recommendation/engine";
import { getRequestUserId } from "@/lib/identity/request";

export const dynamic = "force-dynamic";

/** GET /api/recommendations — next best actions from live system state. */
export async function GET(req: NextRequest) {
  try {
    const userId = getRequestUserId(req);
    const recommendations = await generateRecommendations(userId);
    return NextResponse.json({ recommendations });
  } catch (err: any) {
    console.error("[API/Recommendations]", err);
    return NextResponse.json(
      { recommendations: [], error: err.message },
      { status: 500 },
    );
  }
}
