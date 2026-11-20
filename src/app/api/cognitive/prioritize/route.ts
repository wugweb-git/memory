import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { buildContext } from '@/lib/cognitive/contextBuilder';
import { runLLM } from '@/lib/cognitive/llm';
import { dailyLimitResponse } from '@/lib/cognitive/limit-response';
import { readJsonObject, badRequest } from '@/lib/validation/http';
import { resolveUserId, parseMode, parseItems } from '@/lib/cognitive/validation';
import { logDecisionNeon } from '@/lib/cognitive/logging/neon';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/cognitive/prioritize
 * --------------------------------
 * L3 Prioritization Engine — Rank_Actions(recommendations, signals) from spec.
 * Takes a list of pending items and ranks them by signal alignment and context.
 * Strictly read-only — never mutates lower layers.
 *
 * Input contract:  { user_id: string, items: string[], mode?: string }
 * Output contract: { ranked: [{ item, rank, reason, signal_match }], confidence, reasoning }
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`cognitive:prioritize:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await readJsonObject(req);
    if (!body) return badRequest('JSON object body required');
    const uid = resolveUserId(body, actor.userId);
    if (!uid.ok) return NextResponse.json({ error: uid.error }, { status: uid.status });
    const modeP = parseMode(body.mode);
    if (!modeP.ok) return badRequest(modeP.error);
    const itemsP = parseItems(body.items);
    if (!itemsP.ok) return badRequest(itemsP.error);
    const user_id = uid.value;
    const mode = modeP.value;
    const items = itemsP.value;

    // 1. Build bounded context (read-only)
    const context = await buildContext(user_id);

    // 2. Mode-aware prioritization prompt
    const modeGuide: Record<string, string> = {
      architect: 'Prioritize by systems impact, long-term leverage, and structural dependencies.',
      founder:   'Prioritize by business outcomes, capital efficiency, and market timing.',
      operator:  'Prioritize by immediate unblocking potential, velocity, and daily momentum.'
    };

    const prompt = `You are a prioritization engine for a personal operating system.

MODE: ${mode}
PRIORITIZATION LENS: ${modeGuide[mode] || modeGuide.architect}

ITEMS TO RANK (rank all of them — do not skip):
${JSON.stringify(items)}

USER CONTEXT:
Active entities: ${JSON.stringify(context.entities.slice(0, 10))}
Recent signals:  ${JSON.stringify(context.signals.slice(0, 8))}

TASK:
Rank ALL items by priority given the current context and mode lens.
Rank 1 = highest priority.

GUARDRAILS:
- signal_match MUST reference a specific entity name or signal type from context above.
- reason must be specific — no generic statements like "this is important".
- Rank all ${items.length} items. Include every item in ranked[].
- Max 5 recommendations are enforced — but rank all items regardless.

OUTPUT JSON ONLY (no markdown fences):
{
  "ranked": [
    {
      "item": "exact item text from input",
      "rank": 1,
      "reason": "specific reason tied to active context",
      "signal_match": "entity or signal name from context"
    }
  ],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence summary of ranking logic"
}`;

    // 3. Run LLM
    const raw = await runLLM(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();

    let output: any;
    try {
      output = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: 'Ranking engine returned malformed output' },
        { status: 502 }
      );
    }

    // 4. Validate ranked array
    if (!output || typeof output !== 'object') {
      return NextResponse.json({ error: 'Ranking engine returned malformed output' }, { status: 502 });
    }
    if (!Array.isArray(output.ranked)) {
      output.ranked = [];
    }

    // 5. Sanitize confidence
    output.ranked = output.ranked.slice(0, items.length);
    if (typeof output.confidence !== 'number' || Number.isNaN(output.confidence)) {
      output.confidence = 0.5;
    }
    output.confidence = Math.min(1, Math.max(0, output.confidence));

    // 6. Store in decision_logs
    await logDecisionNeon({ userId: user_id, mode, context, output });

    return NextResponse.json(output);

  } catch (err: any) {
    console.error('[API/Cognitive/Prioritize]', err);
    const limited = dailyLimitResponse(err);
    if (limited) return limited;
    return NextResponse.json({ error: 'Prioritization failure' }, { status: /LLM_FAILURE/.test(String(err?.message)) ? 502 : 500 });
  }
}
