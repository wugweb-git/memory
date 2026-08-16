import { NextRequest, NextResponse } from 'next/server';
import { runMemoryPipeline } from '@/jobs/memory-pipeline';
import { postgres } from '@/lib/db/postgres';
import { getRequestUser } from '@/lib/security/auth';
import { hasPermission } from '@/lib/security/roles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`; manual runs can
 *  use JOB_SECRET or an admin session. Same pattern as /api/jobs/run. */
function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (process.env.CRON_SECRET && bearer === process.env.CRON_SECRET) return true;
  if (process.env.JOB_SECRET && (bearer === process.env.JOB_SECRET || req.headers.get('x-job-secret') === process.env.JOB_SECRET)) return true;
  const actor = getRequestUser(req);
  return hasPermission(actor.role, 'admin:read');
}

/**
 * L1 (embedding) / L2 (processing) / L2.5 (semantic) pipeline entrypoint.
 *
 * This is what actually moves memory packets from `pending` -> `embedded` /
 * `complete`, which is what every downstream surface (RAG retrieval, /ask,
 * cognitive context, semantic graph, signals) depends on. It replaces the
 * old node-cron-based src/lib/memory/scheduler.ts, which never ran in
 * production (dead code + incompatible with Vercel's serverless model).
 *
 * Wire this to Vercel Cron (see vercel.json) or an external trigger
 * (cron-job.org / QStash) if your plan only allows daily cron granularity.
 */
async function run() {
  const result = await runMemoryPipeline();
  try {
    await postgres.executionAuditLog.create({
      data: { eventType: 'jobs:process-memory', payload: result as any, status: 'ok' },
    });
  } catch {
    /* audit is best-effort */
  }
  return result;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await run());
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await run());
}
