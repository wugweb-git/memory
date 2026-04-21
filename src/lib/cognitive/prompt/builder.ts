/**
 * Prompt Builder
 * --------------
 * Generates the structured prompt for the reasoning engine.
 */

export function buildPrompt(params: {
  context: any;
  history: any[];
  mode: string;
  external_input?: string;
  modeInstruction: string;
}) {
  const { context, history, mode, external_input, modeInstruction } = params;

  return `
MODE: ${mode}
INSTRUCTION: ${modeInstruction}

CONTEXT:
Entities: ${JSON.stringify(context.entities)}
Signals: ${JSON.stringify(context.signals)}

USER INTELLIGENCE (Belief System):
Traits: ${JSON.stringify(context.intelligence?.traits || [])}
Preferences: ${JSON.stringify(context.intelligence?.preferences || [])}
Persona Profile: ${JSON.stringify(context.intelligence?.persona || {})}

HISTORY:
${JSON.stringify(history)}

${external_input ? `INPUT Stimulus: ${external_input}` : ""}

RULES:
- MAX 5 recommendations.
- Every recommendation must be actionable and grounded in the provided context (reference specific entities or signals).
- NO generic advice (e.g., "be consistent", "stay focused").
- Deduplicate: Do not repeat recommendations present in the HISTORY.
- If context is insufficient for mode "${mode}", return empty arrays and low confidence.

OUTPUT JSON ONLY (No markdown, no explanation):
{
  "recommendations": ["specific action tied to context"],
  "priorities": ["High: ...", "Medium: ...", "Low: ..."],
  "gaps": ["missing signal or entity type for this mode"],
  "reasoning": "one sentence explaining the logic",
  "confidence": 0.0-1.0
}
`;
}
