import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { IDENTITY_CONFIG } from "@/config/identity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || IDENTITY_CONFIG.DEFAULT_USER_ID;
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);

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
        const summary =
          (typeof out?.summary === "string" && out.summary) ||
          (typeof out?.verdict === "string" && out.verdict) ||
          (typeof out?.recommendation === "string" && out.recommendation) ||
          null;
        return {
          id: t.id,
          type: t.mode,
          confidence: t.confidence,
          at: t.createdAt.toISOString(),
          summary: summary ? summary.slice(0, 240) : null,
        };
      }),
    });
  } catch (error: unknown) {
    console.error("[Cognitive Traces]", error);
    return NextResponse.json({ status: "error", traces: [] }, { status: 500 });
  }
}
