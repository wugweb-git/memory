import { verifySharedToken } from '@/lib/webhooks/verify';
import { NextRequest, NextResponse } from "next/server";
import { runScheduledPublisher } from "@/jobs/scheduled-publisher";
import { runPublishingQueueJob } from "@/jobs/publishing-queue";
import { runRetryWorker } from "@/jobs/retry-worker";
import { runRetentionCleanup } from "@/jobs/retention-cleanup";
import { runSourceSync } from "@/jobs/source-sync";
import { runBehavioralReconciliationJob } from "@/jobs/behavioral-reconciliation";
import { runPersonaEvolutionJob } from "@/jobs/persona-evolution";
import { runFingerprintValidationJob } from "@/jobs/fingerprint-validation";
import { postgres } from "@/lib/db/postgres";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`; manual runs can
 *  use JOB_SECRET or an admin session. */
function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (process.env.CRON_SECRET && verifySharedToken(bearer ?? null, process.env.CRON_SECRET)) return true;
  if (process.env.JOB_SECRET && (verifySharedToken(bearer ?? null, process.env.JOB_SECRET) || verifySharedToken(req.headers.get('x-job-secret'), process.env.JOB_SECRET))) return true;
  const actor = getRequestUser(req);
  return hasPermission(actor.role, "admin:read");
}

/** Skip optional persona jobs once this much of the 60s budget is used. */
const PERSONA_BUDGET_MS = 40_000;

/** Run a job so a failure is reported instead of aborting the whole run. */
async function safeJob<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function runAll() {
  const startedAt = Date.now();
  // Order matters: pull new source items → promote due/scheduled → publish → sweep retries.
  const sources = await runSourceSync();
  const scheduler = await runScheduledPublisher();
  const queue = await runPublishingQueueJob();
  const retries = await runRetryWorker();
  // L4 persona jobs: after publishing, before retention, only if budget allows.
  const behavioral =
    Date.now() - startedAt > PERSONA_BUDGET_MS
      ? { skipped: "time budget" }
      : await safeJob(() => runBehavioralReconciliationJob());
  const overBudget = () => Date.now() - startedAt > PERSONA_BUDGET_MS;
  const personaEvolution = overBudget() ? { skipped: "time budget" } : await safeJob(() => runPersonaEvolutionJob());
  const fingerprints = overBudget() ? { skipped: "time budget" } : await safeJob(() => runFingerprintValidationJob());
  const retention = await runRetentionCleanup();
  const result = { sources, scheduler, queue, retries, behavioral, personaEvolution, fingerprints, retention, ranAt: new Date().toISOString() };

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
