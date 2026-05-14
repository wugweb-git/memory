import { NextRequest, NextResponse } from "next/server";
import { getAdaptiveUiProfile } from "@/lib/persona/adaptive-ui";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "system_user";
  const profile = await getAdaptiveUiProfile(userId);
  return NextResponse.json(profile);
}
