import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/identity/request";
import { postgres } from "@/lib/db/postgres";
import { clampLimit } from "@/lib/validation/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = getRequestUserId(req);
    const limit = clampLimit(url.searchParams.get("limit"), 20, 50);

    const traces = await postgres.decisionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        mode: true,
        confidence: true,
        createdAt: true,
        outputJson: true,
      },
    });

    return NextResponse.json({
      status: "ok",
      traces: traces.map((t) => {
        const out = t.outputJson as Record<string, unknown> | null;
        // Decision output contract (prompt/builder.ts): recommendations[], priorities[],
        // gaps[], reasoning, confidence. Prefer the first recommendation, then reasoning.
        const recs = Array.isArray(out?.recommendations) ? out.recommendations : [];
        const firstRec = recs.find((r): r is string => typeof r === "string" && r.length > 0);
        const summary =
          firstRec ||
          (typeof out?.reasoning === "string" && out.reasoning) ||
          null;
        return {
          id: t.id,
          type: t.mode,
          confidence: t.confidence,
          at: t.createdAt.toISOString(),
          summary: summary ? summary.slice(0, 240) : null,
          recommendation_count: recs.length,
        };
      }),
    });
  } catch (error: unknown) {
    console.error("[Cognitive Traces]", error);
    return NextResponse.json({ status: "error", traces: [] }, { status: 500 });
  }
}
