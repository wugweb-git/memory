import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from '@/lib/identity/request';
import { requireAdmin } from '@/lib/security/auth';
import { getAdaptiveUiProfile, updateAdaptiveUiProfile } from "@/lib/persona/adaptive-ui";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const userId = getRequestUserId(req);
    const profile = await getAdaptiveUiProfile(userId);
    return NextResponse.json(profile);
  } catch (err) {
    console.error("[L4] adaptive-ui GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const userId = getRequestUserId(req);
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
