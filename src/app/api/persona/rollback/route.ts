import { NextRequest, NextResponse } from "next/server";
import { rollbackPersonaField } from "@/lib/persona/evolution";
import { getEvolutionTimeline } from "@/lib/persona/evolution";
import { getRequestUserId } from "@/lib/identity/request";
import { requireOwner } from "@/lib/security/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const VALID_FIELDS = ["communicationStyle", "writingStyle", "decisionStyle"];

/** GET /api/persona/rollback — the evolution timeline (what a rollback would target). */
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  const timeline = await getEvolutionTimeline(userId);
  return NextResponse.json({ timeline });
}

/**
 * POST /api/persona/rollback — revert a persona field to its prior value.
 * Body: { field: 'communicationStyle'|'writingStyle'|'decisionStyle', toLogId? }
 * Existing rollbackPersonaField() logic had no caller before this route.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`persona:rollback:${actor.userId}`, 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json();
  if (!VALID_FIELDS.includes(body?.field)) {
    return NextResponse.json({ error: `field must be one of ${VALID_FIELDS.join(", ")}` }, { status: 400 });
  }

  const userId = getRequestUserId(req);
  const ok = await rollbackPersonaField({ userId, field: body.field, toLogId: body.toLogId });
  if (!ok) {
    return NextResponse.json({ error: "No prior value found to roll back to" }, { status: 404 });
  }
  return NextResponse.json({ rolled_back: true, field: body.field });
}
