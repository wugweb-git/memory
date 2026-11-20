import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRequestUser, requireOwner } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";
import { confirmManualPost } from "@/lib/publishing/manual-confirm";

export const dynamic = 'force-dynamic';

/** Owner confirms they posted a prepared output by hand (Substack, Behance, Dribbble). Sends nothing anywhere. */
export async function POST(req: NextRequest) {
  try {
    const gate = requireOwner(req);
    if (gate instanceof NextResponse) return gate;
    const actor = getRequestUser(req);
    const limit = await checkRateLimit(`publish:${actor.userId}`, 20, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = ((await req.json().catch(() => ({}))) ?? {});
    const result = await confirmManualPost({ outputId: body?.outputId, url: body?.url });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      status: "success",
      message: "Marked as posted",
      delivery: { platform: result.delivery.platform, status: result.delivery.status, delivered: result.delivery.delivered, postUrl: result.delivery.postUrl ?? null },
    });
  } catch (err) {
    console.error("[API/Output/ManualConfirm] Error:", err);
    return NextResponse.json({ error: "Could not record the post" }, { status: 500 });
  }
}
