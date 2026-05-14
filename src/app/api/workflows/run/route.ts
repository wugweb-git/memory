import { NextRequest, NextResponse } from "next/server";
import { runWorkflow } from "@/lib/workflows/engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await runWorkflow({ workflowName: body.workflowName || "manual", payload: body.payload || {} });
  return NextResponse.json(result);
}
