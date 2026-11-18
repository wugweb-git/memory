import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from '@/lib/identity/request';
import { requireAdmin } from '@/lib/security/auth';
import { getTopTraits } from "@/lib/persona/behavior";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const userId = getRequestUserId(req);
    const traits = await getTopTraits(userId, 20);
    return NextResponse.json(traits);
  } catch (err) {
    console.error("[L4] traits GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
