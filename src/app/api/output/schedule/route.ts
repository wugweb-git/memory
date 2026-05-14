import { NextRequest, NextResponse } from "next/server";
import { enqueuePublishing } from "@/lib/queue/publishing";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export async function POST(req: NextRequest) {
  const actor = getRequestUser(req);
  const limit = checkRateLimit(`schedule:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  if (!hasPermission(actor.role, "schedule")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const entry = await enqueuePublishing({
    userId: body.userId || actor.userId,
    outputId: body.outputId,
    platform: body.platform,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
  });
  return NextResponse.json(entry);
}
