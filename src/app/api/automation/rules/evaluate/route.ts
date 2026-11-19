import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/identity/request";
import { badRequest, readJsonObject } from "@/lib/validation/http";
import { evaluateRules, TRIGGER_TYPES, type TriggerType } from "@/lib/automation/rules";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manually fire the evaluator for an event; `dryRun: true` only reports matches. */
export async function POST(req: NextRequest) {
  const userId = getRequestUserId(req);
  const body = await readJsonObject(req);
  if (!body) return badRequest("JSON object body required");
  if (!TRIGGER_TYPES.includes(body.type as TriggerType)) return badRequest(`type must be one of: ${TRIGGER_TYPES.join(", ")}`);
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const results = await evaluateRules(
    userId,
    { type: body.type as TriggerType, platform: str(body.platform), content: str(body.content), outputId: str(body.outputId) },
    { dryRun: body.dryRun === true },
  );
  return NextResponse.json({ results });
}
