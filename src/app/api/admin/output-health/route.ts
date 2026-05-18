import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [drafts, pushed, queued, failedQueue, published] = await Promise.all([
      postgres.outputLog.count({ where: { status: "draft" } }).catch(() => 0),
      postgres.outputLog.count({ where: { status: "pushed" } }).catch(() => 0),
      postgres.publishingQueue.count({ where: { status: { in: ["queued", "scheduled", "pending"] } } }).catch(() => 0),
      postgres.publishingQueue.count({ where: { status: "failed" } }).catch(() => 0),
      postgres.publishedOutput.count().catch(() => 0),
    ]);

    return NextResponse.json({
      status: "ok",
      generation: drafts + pushed > 0 ? "active" : "idle",
      publishing: queued + published > 0 ? "active" : "idle",
      metrics: {
        drafts,
        pushed,
        queued,
        failedQueue,
        published,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ADMIN] output-health error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
