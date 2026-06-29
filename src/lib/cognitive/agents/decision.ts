import { runAgentLLM } from '../llm';

/**
 * Decision agent (L3 Phase 4) — turns the Reasoner's analysis into the
 * structured decision contract. Output is the same JSON the single-pass
 * pipeline returns, so sanitize/dedup/critic/log run unchanged downstream.
 */
export async function runDecisionAgent(params: {
  analysis: string;
  context: any;
  mode: string;
  externalInput?: string | null;
  modelName: string;
}): Promise<string> {
  const { analysis, context, mode, externalInput, modelName } = params;

  const prompt = `MODE: ${mode}

ANALYSIS (from Reasoner)
${analysis}

CONTEXT
Entities: ${JSON.stringify((context.entities ?? []).slice(0, 10))}
Signals: ${JSON.stringify((context.signals ?? []).slice(0, 10))}
${externalInput ? `EXTERNAL INPUT: ${externalInput}` : ''}

RULES
- max 5 recommendations
- every recommendation must map to a specific entity or signal
- no generic advice, no repetition

OUTPUT JSON ONLY (no markdown):
{
  "recommendations": [],
  "priorities": [],
  "gaps": [],
  "opportunities": [],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}`;

  return runAgentLLM(
    prompt,
    modelName,
    'You are the Decision Engine agent. Output strict JSON only — no markdown, no prose outside JSON.',
    0.1,
  );
}
