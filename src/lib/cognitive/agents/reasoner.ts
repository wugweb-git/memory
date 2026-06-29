import { runAgentLLM } from '../llm';

/**
 * Reasoner agent (L3 Phase 4) — analysis only, never decides.
 * Produces a concise read of the context for the Decision agent to act on.
 */
export async function runReasoner(
  context: any,
  mode: string,
  modelName: string,
): Promise<string> {
  const prompt = `MODE: ${mode}

CONTEXT
Entities: ${JSON.stringify((context.entities ?? []).slice(0, 15))}
Signals: ${JSON.stringify((context.signals ?? []).slice(0, 15))}
Relationships: ${JSON.stringify((context.relationships ?? []).slice(0, 15))}

TASK
Analyze this context. Identify the key patterns, momentum, and what matters most right now.

RULES
- Reference specific entities/signals.
- Call out uncertainty where data is thin.
- Do NOT produce recommendations or decisions — analysis only.

Return a concise analysis (4-6 sentences).`;

  return runAgentLLM(
    prompt,
    modelName,
    'You are the Reasoner agent. Analyze only; never decide.',
    0.2,
  );
}
