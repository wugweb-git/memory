import { NextRequest, NextResponse } from "next/server";
import { enqueuePublishing } from "@/lib/queue/publishing";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRequestUser, requireOwner } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set(["linkedin", "medium", "portfolio", "cms", "email-digest", "export-api"]);

export async function POST(req: NextRequest) {
  const gate = requireOwner(req);
  if (gate instanceof NextResponse) return gate;
  const actor = getRequestUser(req);
  const limit = await checkRateLimit(`schedule:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  if (!hasPermission(actor.role, "schedule")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.outputId !== "string" || !body.outputId) {
    return NextResponse.json({ error: "outputId required" }, { status: 400 });
  }
  if (typeof body.platform !== "string" || !PLATFORMS.has(body.platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }
  let scheduledAt: Date | null = null;
  if (body.scheduledAt) {
    scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "scheduledAt must be a valid date" }, { status: 400 });
    }
  }
  const entry = await enqueuePublishing({
    userId: actor.userId,
    outputId: body.outputId,
    platform: body.platform,
    scheduledAt,
  });
  return NextResponse.json(entry);
}
