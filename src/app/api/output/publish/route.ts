import { NextRequest, NextResponse } from "next/server";
import { pushToAutomation } from "@/lib/output/automation";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const actor = getRequestUser(req);
    const limit = checkRateLimit(`publish:${actor.userId}`, 20, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { outputId } = body;

    if (!outputId) {
      return NextResponse.json({ error: "outputId required" }, { status: 400 });
    }

    const result = await pushToAutomation(outputId, {
      profileUsername: body.profileUsername,
    });

    const messages: Record<string, string> = {
      webhook: 'Artifact pushed to n8n automation',
      profile_only: 'N8N not configured — artifact published to profile',
      skipped: 'Automation skipped (configure N8N_WEBHOOK_URL or profile publish)',
    };

    return NextResponse.json({
      status: 'success',
      mode: result.mode,
      message: messages[result.mode],
      profilePublished: result.profilePublished,
      payload: result.payload,
    });

  } catch (err: any) {
    console.error("[API/Output/Push] Error:", err);
    return NextResponse.json(
      { error: "Automation push failed", details: err.message },
      { status: 500 }
    );
  }
}
