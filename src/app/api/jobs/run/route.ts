import { NextRequest, NextResponse } from "next/server";
import { runScheduledPublisher } from "@/jobs/scheduled-publisher";
import { runPublishingQueueJob } from "@/jobs/publishing-queue";
import { runRetryWorker } from "@/jobs/retry-worker";
import { postgres } from "@/lib/db/postgres";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`; manual runs can
 *  use JOB_SECRET or an admin session. */
function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (process.env.CRON_SECRET && bearer === process.env.CRON_SECRET) return true;
  if (process.env.JOB_SECRET && (bearer === process.env.JOB_SECRET || req.headers.get("x-job-secret") === process.env.JOB_SECRET)) return true;
  const actor = getRequestUser(req);
  return hasPermission(actor.role, "admin:read");
}

async function runAll() {
  // Order matters: promote due/scheduled items → publish pending → sweep retries.
  const scheduler = await runScheduledPublisher();
  const queue = await runPublishingQueueJob();
  const retries = await runRetryWorker();
  const result = { scheduler, queue, retries, ranAt: new Date().toISOString() };

  try {
    await postgres.executionAuditLog.create({
      data: { eventType: "jobs:run", payload: result as any, status: "ok" },
    });
  } catch {
    /* audit is best-effort */
  }
  return result;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runAll());
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runAll());
}
