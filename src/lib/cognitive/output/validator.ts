/**
 * Output Validator
 * ----------------
 * Ensures LLM output strictly conforms to the expected structure.
 */

export function validateOutput(output: any) {
  if (!output || typeof output !== "object") {
    throw new Error("INVALID_LLM_OUTPUT_SHAPE");
  }

  if (!Array.isArray(output.recommendations)) {
    throw new Error("MISSING_RECOMMENDATIONS_ARRAY");
  }

  return {
    recommendations: output.recommendations.slice(0, 5),
    priorities: Array.isArray(output.priorities) ? output.priorities.slice(0, 5) : [],
    gaps: Array.isArray(output.gaps) ? output.gaps.slice(0, 3) : [],
    opportunities: Array.isArray(output.opportunities) ? output.opportunities.slice(0, 3) : [],
    confidence: typeof output.confidence === "number" ? Math.min(1, Math.max(0, output.confidence)) : 0.5,
    reasoning: typeof output.reasoning === "string" ? output.reasoning : "Reasoning unavailable."
  };
}
