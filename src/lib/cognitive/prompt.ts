export type CognitiveMode = "architect" | "founder" | "operator";

const MODE_GUIDES: Record<CognitiveMode, string> = {
  architect: "Evaluate technological debt, structural durability, and system integration. Avoid fluff.",
  founder: "Evaluate project leverage, capital/time efficiency, and market momentum.",
  operator: "Evaluate immediate execution blocks, velocity, and daily output priorities."
};

/**
 * Constructs the structured prompt for the Decision Engine.
 * Enforces snake_case and strict grounding in Persona Intelligence (L4).
 */
export function buildPrompt(params: {
  context: any;
  mode: CognitiveMode;
  external_input?: string;
}) {
  const { context, mode, external_input } = params;
  const guide = MODE_GUIDES[mode];

  return `You are the Decision Engine for a Personal Operating System.
Your Perspective: ${mode.toUpperCase()}
Mode Guideline: ${guide}

CONTEXT (L1-L2.5 Facts):
${JSON.stringify({
  entities: context.entities,
  signals: context.signals,
  relationships: context.relationships
})}

PERSONA INTELLIGENCE (L4):
${JSON.stringify(context.intelligence || {})}

RECENT HISTORY (L3):
${JSON.stringify(context.recent_decisions)}

${external_input ? `STIMULUS: "${external_input}"` : "Analyze the current state and provide proactive guidance."}

RULES:
1. Every recommendation MUST reference a specific Entity or Signal.
2. Max 5 recommendations.
3. Use snake_case for all JSON keys.
4. NO generic advice.

OUTPUT SCHEMA (JSON Only):
{
  "recommendations": ["specific action"],
  "priorities": ["High/Medium/Low: ..."],
  "gaps": ["missing signal or entity types"],
  "opportunities": ["potentials for leverage"],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of the logic peak"
}
`;
}
