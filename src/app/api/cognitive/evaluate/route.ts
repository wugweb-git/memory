import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/cognitive/contextBuilder';
import { runLLM } from '@/lib/cognitive/llm';
import { logDecisionNeon } from '@/lib/cognitive/logging/neon';

export const dynamic = 'force-dynamic';

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
  try {
    const body = await req.json();
    const { user_id, input_text, mode = 'architect' } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }
    if (!input_text || typeof input_text !== 'string' || input_text.trim().length < 10) {
      return NextResponse.json({ error: 'input_text required (minimum 10 chars)' }, { status: 400 });
    }

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
        { error: 'Reasoning engine returned malformed output', preview: clean.slice(0, 200) },
        { status: 500 }
      );
    }

    // 4. Confidence gate — override verdict if confidence is too low
    if (typeof output.confidence === 'number' && output.confidence < 0.4) {
      output.verdict = 'Poor Fit';
    }

    // 5. Sanitize arrays
    output.why_yes      = (output.why_yes || []).slice(0, 5);
    output.why_no       = (output.why_no || []).slice(0, 5);
    output.action_items = (output.action_items || []).slice(0, 3);

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
    return NextResponse.json(
      { error: 'Evaluation engine failure', details: err.message },
      { status: 500 }
    );
  }
}
