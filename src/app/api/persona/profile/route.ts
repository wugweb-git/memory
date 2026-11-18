import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from '@/lib/identity/request';
import { requireAdmin } from '@/lib/security/auth';
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const userId = getRequestUserId(req);
    const profile = await postgres.personaProfile.findUnique({ where: { userId } });
    return NextResponse.json(profile || { userId, confidenceScore: 0.5 });
  } catch (err) {
    console.error("[L4] profile GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
