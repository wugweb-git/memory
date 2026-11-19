import { NextRequest, NextResponse } from "next/server";
import { publishOutput } from "@/lib/output/automation";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRequestUser, requireOwner } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const gate = requireOwner(req);
    if (gate instanceof NextResponse) return gate;
    const actor = getRequestUser(req);
    const limit = await checkRateLimit(`publish:${actor.userId}`, 20, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { outputId } = body;

    if (!outputId || typeof outputId !== "string") {
      return NextResponse.json({ error: "outputId required" }, { status: 400 });
    }

    const result = await publishOutput(outputId, {
      profileUsername: body.profileUsername,
    });

    const messages: Record<string, string> = {
      published: 'Artifact published to profile' + (result.sanitySynced ? ' and synced to CMS' : ''),
      duplicate: 'Already published — skipped (idempotent)',
      skipped: 'Publish skipped — profile publish failed',
    };

    return NextResponse.json({
      status: result.mode === 'skipped' ? 'error' : 'success',
      mode: result.mode,
      message: messages[result.mode],
      platform: result.platform,
      profilePublished: result.profilePublished,
      sanitySynced: result.sanitySynced,
      payload: result.payload,
      // Additive: honest external-delivery outcome (delivered:false when nothing left the system).
      platformResult: result.platformResult
        ? { status: result.platformResult.status, delivered: result.platformResult.delivered, externalId: result.platformResult.externalId, error: result.platformResult.error }
        : null,
    }, { status: result.mode === 'skipped' ? 502 : 200 });

  } catch (err: any) {
    console.error("[API/Output/Push] Error:", err);
    const notFound = /Output not found/.test(err?.message ?? "");
    return NextResponse.json(
      { error: notFound ? "Output not found" : "Automation push failed" },
      { status: notFound ? 404 : 500 }
    );
  }
}
