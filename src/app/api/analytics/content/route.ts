import { NextRequest, NextResponse } from "next/server";
import { getContentAnalytics } from "@/lib/analytics/content";
import { getRequestUserId } from "@/lib/identity/request";

export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  return NextResponse.json(await getContentAnalytics(userId));
}
