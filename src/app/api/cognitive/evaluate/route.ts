import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { buildContext } from '@/lib/cognitive/contextBuilder';
import { runLLM } from '@/lib/cognitive/llm';
import { dailyLimitResponse } from '@/lib/cognitive/limit-response';
import { readJsonObject, badRequest } from '@/lib/validation/http';
import { resolveUserId, parseMode, parseInputText } from '@/lib/cognitive/validation';
import { logDecisionNeon } from '@/lib/cognitive/logging/neon';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/cognitive/evaluate
 * ----------------------------
 * L3 Opportunity Engine — Flow 2 from spec.
 * Evaluates a JD, client brief, or idea against the user's current
 * memory context (L1–L2.5). Strictly read-only — never mutates lower layers.
 *
 * Input contract:  { user_id: string, input_text: string, mode?: string }
 * Output contract: { fit_score, verdict, why_yes, why_no, action_items, confidence, reasoning }
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`cognitive:evaluate:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await readJsonObject(req);
    if (!body) return badRequest('JSON object body required');
    const uid = resolveUserId(body, actor.userId);
    if (!uid.ok) return NextResponse.json({ error: uid.error }, { status: uid.status });
    const modeP = parseMode(body.mode);
    if (!modeP.ok) return badRequest(modeP.error);
    const inputP = parseInputText(body.input_text);
    if (!inputP.ok) return badRequest(inputP.error);
    const user_id = uid.value;
    const mode = modeP.value;
    const input_text = inputP.value;

    // 1. Build bounded context from L1-L2.5 (read-only)
    const context = await buildContext(user_id);

    // 2. Mode-aware evaluation prompt
    const modeGuide: Record<string, string> = {
      architect: 'Evaluate through the lens of systems architecture and long-term technical fit.',
      founder:   'Evaluate through the lens of business leverage, market opportunity, and venture fit.',
      operator:  'Evaluate through the lens of immediate execution capacity and momentum alignment.'
    };

    const prompt = `You are an opportunity evaluation engine for a personal operating system.

MODE: ${mode}
MODE LENS: ${modeGuide[mode] || modeGuide.architect}

EXTERNAL INPUT (Job description, client brief, or idea):
"${input_text.trim()}"

USER CONTEXT (from memory system — verified entities and active signals only):
Active entities: ${JSON.stringify(context.entities.slice(0, 10))}
Recent signals:  ${JSON.stringify(context.signals.slice(0, 10))}

TASK:
Evaluate how well this input matches the user's active domains, entities, and signal patterns.

GUARDRAILS:
- Every item in why_yes and why_no MUST reference a specific entity name or signal type from context above.
- action_items must be concrete and tied to the gap — no generic advice. Max 3 items.
- If context entities and signals are empty or very sparse, lower confidence and note this in reasoning.
- Do not hallucinate entities or signals not present in the context.

OUTPUT JSON ONLY (no markdown fences):
{
  "fit_score": 0.0-1.0,
  "verdict": "Strong Fit | Moderate Fit | Poor Fit",
  "why_yes": ["specific overlap with named entity or signal from context"],
  "why_no": ["specific gap or mismatch with context"],
  "action_items": ["concrete step to increase fit — reference the gap"],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence summary of what drove this evaluation"
}`;

    // 3. Run LLM — read-only reasoning, no side effects
    const raw = await runLLM(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();

    let output: any;
    try {
      output = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: 'Reasoning engine returned malformed output' },
        { status: 502 }
      );
    }

    // 4. Confidence gate — override verdict if confidence is too low
    if (typeof output.confidence === 'number' && output.confidence < 0.4) {
      output.verdict = 'Poor Fit';
    }

    // 5. Sanitize arrays
    if (!output || typeof output !== 'object') {
      return NextResponse.json({ error: 'Reasoning engine returned malformed output' }, { status: 502 });
    }
    const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);
    output.why_yes      = arr(output.why_yes, 5);
    output.why_no       = arr(output.why_no, 5);
    output.action_items = arr(output.action_items, 3);
    output.confidence   = typeof output.confidence === 'number' ? Math.min(1, Math.max(0, output.confidence)) : 0.5;

    // 6. Store in decision_logs (read logging only — never writes to L1/L2)
    await logDecisionNeon({
      userId: user_id,
      mode,
      context: { ...context, external_input: input_text },
      output
    });

    return NextResponse.json(output);

  } catch (err: any) {
    console.error('[API/Cognitive/Evaluate]', err);
    const limited = dailyLimitResponse(err);
    if (limited) return limited;
    return NextResponse.json(
      { error: 'Evaluation engine failure' },
      { status: /LLM_FAILURE/.test(String(err?.message)) ? 502 : 500 }
    );
  }
}
