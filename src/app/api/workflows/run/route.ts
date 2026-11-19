import { NextRequest, NextResponse } from "next/server";
import { runWorkflow } from "@/lib/workflows/engine";
import { badRequest, readJsonObject } from "@/lib/validation/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await readJsonObject(req);
  if (!body) return badRequest("JSON object body required");
  const name = typeof body.workflowName === "string" && body.workflowName.trim() ? body.workflowName.trim() : "manual";
  if (name.length > 100) return badRequest("workflowName too long");
  const payload =
    body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? (body.payload as Record<string, unknown>)
      : {};
  try {
    const result = await runWorkflow({ workflowName: name, payload });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    console.error("[API/Workflows/Run] failed:", err);
    return NextResponse.json({ error: "Workflow run failed" }, { status: 500 });
  }
}
