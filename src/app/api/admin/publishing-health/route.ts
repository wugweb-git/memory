import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [queuePending, queueFailed, published, schedulerStates, retryCount] = await Promise.all([
      postgres.publishingQueue.count({ where: { status: { in: ["queued", "scheduled", "pending"] } } }).catch(() => 0),
      postgres.publishingQueue.count({ where: { status: "failed" } }).catch(() => 0),
      postgres.publishedOutput.count().catch(() => 0),
      postgres.schedulerState.count().catch(() => 0),
      postgres.retryQueue.count().catch(() => 0),
    ]);

    return NextResponse.json({
      status: "ok",
      queueSize: queuePending + queueFailed,
      pending: queuePending,
      failed: queueFailed,
      published,
      schedulerStates,
      retryQueue: retryCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ADMIN] publishing-health error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}