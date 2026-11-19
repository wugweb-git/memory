import { verifySharedToken } from '@/lib/webhooks/verify';
import { NextRequest, NextResponse } from "next/server";
import { runScheduledPublisher } from "@/jobs/scheduled-publisher";
import { runPublishingQueueJob } from "@/jobs/publishing-queue";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (process.env.CRON_SECRET && verifySharedToken(bearer ?? null, process.env.CRON_SECRET)) return true;
  if (process.env.JOB_SECRET && (verifySharedToken(bearer ?? null, process.env.JOB_SECRET) || verifySharedToken(req.headers.get('x-job-secret'), process.env.JOB_SECRET))) return true;
  return hasPermission(getRequestUser(req).role, "admin:read");
}

/**
 * Drains the publishing queue only: promotes due/scheduled/stale items, then
 * publishes pending ones with retry backoff and dead-letter. Idempotent (items
 * are claimed atomically; publishOutput is idempotent). Also runs as part of
 * /api/jobs/run, so the daily cron covers it; this lighter route is for
 * GitHub Actions / manual triggers.
 */
async function drain(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const scheduler = await runScheduledPublisher();
    const queue = await runPublishingQueueJob();
    return NextResponse.json({ scheduler, queue, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error("[jobs/publishing] failed:", err);
    return NextResponse.json({ error: "drain_failed" }, { status: 500 });
  }
}

export const GET = drain;
export const POST = drain;
