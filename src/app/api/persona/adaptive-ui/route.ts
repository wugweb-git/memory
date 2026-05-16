import { NextRequest, NextResponse } from "next/server";
import { getAdaptiveUiProfile, updateAdaptiveUiProfile } from "@/lib/persona/adaptive-ui";
import { IDENTITY_CONFIG } from "@/config/identity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || IDENTITY_CONFIG.DEFAULT_USER_ID;
    const profile = await getAdaptiveUiProfile(userId);
    return NextResponse.json(profile);
  } catch (err) {
    console.error("[L4] adaptive-ui GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || IDENTITY_CONFIG.DEFAULT_USER_ID;
    const body = (await req.json()) as Partial<{
      uiDensity: string;
      preferredMode: string;
      preferredOutputLength: string;
      preferredNavigationStyle: string;
    }>;

    const updated = await updateAdaptiveUiProfile(userId, body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[L4] adaptive-ui PATCH error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
