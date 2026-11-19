import { postgres } from "@/lib/db/postgres";
import { publishOutput } from "@/lib/output/automation";
import { runScheduledPublisher } from "@/jobs/scheduled-publisher";
import { runPublishingQueueJob } from "@/jobs/publishing-queue";
import { runSourceSync } from "@/jobs/source-sync";
import { runRetentionCleanup } from "@/jobs/retention-cleanup";

type WorkflowHandler = (payload: Record<string, unknown>) => Promise<unknown>;

/**
 * Registry of workflows that actually execute. A workflow name that is not
 * registered is rejected and logged as `failed` (never as a fake success).
 */
const WORKFLOWS: Record<string, WorkflowHandler> = {
  "publishing-drain": async () => ({
    scheduler: await runScheduledPublisher(),
    queue: await runPublishingQueueJob(),
  }),
  "publish-output": async (payload) => {
    if (typeof payload.outputId !== "string" || !payload.outputId) throw new Error("outputId required");
    const result = await publishOutput(payload.outputId);
    return { mode: result.mode, platform: result.platform, delivered: result.platformResult?.delivered ?? false };
  },
  "source-sync": async () => runSourceSync(),
  "retention-cleanup": async () => runRetentionCleanup(),
};

export function listWorkflows(): string[] {
  return Object.keys(WORKFLOWS);
}

/** Executes the named workflow and records the real outcome in workflow_logs. */
export async function runWorkflow(params: { workflowName: string; payload?: Record<string, unknown> }) {
  const payload = params.payload ?? {};
  const handler = Object.prototype.hasOwnProperty.call(WORKFLOWS, params.workflowName)
    ? WORKFLOWS[params.workflowName]
    : null;

  let ok = false;
  let result: unknown = null;
  let error: string | null = null;
  if (!handler) {
    error = `Unknown workflow "${params.workflowName}". Available: ${listWorkflows().join(", ")}`;
  } else {
    try {
      result = await handler(payload);
      ok = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "workflow_failed";
    }
  }

  let log: unknown = null;
  try {
    log = await postgres.workflowLog.create({
      data: {
        workflowName: params.workflowName,
        status: ok ? "success" : "failed",
        payload: { input: payload, result } as never,
        error,
      },
    });
  } catch (logErr) {
    console.error("[Workflow] could not write workflow_logs:", logErr);
  }
  return ok ? { ok: true, result, log } : { ok: false, error, log };
}
