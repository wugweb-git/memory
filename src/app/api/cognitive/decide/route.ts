import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { processDecision } from "@/lib/cognitive";
import { dailyLimitResponse } from '@/lib/cognitive/limit-response';
import { readJsonObject, badRequest } from '@/lib/validation/http';
import { resolveUserId, parseMode, parseExternalInput } from '@/lib/cognitive/validation';


export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/cognitive/decide
 * Unified endpoint for the Layer 3 Cognitive Engine.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`cognitive:decide:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await readJsonObject(req);
    if (!body) return badRequest('JSON object body required');
    const uid = resolveUserId(body, actor.userId);
    if (!uid.ok) return NextResponse.json({ error: uid.error }, { status: uid.status });
    const mode = parseMode(body.mode);
    if (!mode.ok) return badRequest(mode.error);
    const ext = parseExternalInput(body.external_input);
    if (!ext.ok) return badRequest(ext.error);

    const result = await processDecision({
      userId: uid.value,
      mode: mode.value,
      external_input: ext.value,
    });

    // Check for logical failure states (Insufficient Data)
    if ((result as any).status === "insufficient_data") {
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("[API/Cognitive/Decide] Error:", err);
    const limited = dailyLimitResponse(err);
    if (limited) return limited;
    return NextResponse.json({ error: "Decision Engine failure", status: "error" }, { status: /LLM_FAILURE/.test(String(err?.message)) ? 502 : 500 });
  }
}
