import { NextRequest, NextResponse } from "next/server";
import { getContentAnalytics } from "@/lib/analytics/content";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "system_user";
  return NextResponse.json(await getContentAnalytics(userId));
}
