import { NextRequest, NextResponse } from "next/server";
import { getContentAnalytics } from "@/lib/analytics/content";
import { getRequestUserId } from "@/lib/identity/request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = getRequestUserId(req);
    return NextResponse.json(await getContentAnalytics(userId));
  } catch (err) {
    console.error("[API/Analytics/Content] failed:", err);
    return NextResponse.json({ error: "Failed to load content analytics" }, { status: 500 });
  }
}
