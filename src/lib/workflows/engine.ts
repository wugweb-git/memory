import { postgres } from "@/lib/db/postgres";

export async function runWorkflow(params: { workflowName: string; payload?: Record<string, unknown> }) {
  try {
    const log = await (postgres as any).workflowLog.create({
      data: { workflowName: params.workflowName, status: "success", payload: params.payload || {} },
    });
    return { ok: true, log };
  } catch (error: any) {
    await (postgres as any).workflowLog.create({
      data: { workflowName: params.workflowName, status: "failed", payload: params.payload || {}, error: error.message },
    });
    return { ok: false, error: error.message };
  }
}
