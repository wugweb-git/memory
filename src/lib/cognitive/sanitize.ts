/**
 * Layer 3 Sanitization Engine
 * --------------------------
 * Ensures raw LLM output is parsed, cleaned, and conforms to the decision schema.
 */
export function sanitize(raw: string) {
  try {
    // 1. Clean markdown or extra characters
    const jsonStr = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonStr);

    // 2. Structural normalization
    const ensureArray = (val: any) => (Array.isArray(val) ? val : []);
    
    return {
      recommendations: ensureArray(data.recommendations).slice(0, 5),
      priorities: ensureArray(data.priorities).slice(0, 5),
      gaps: ensureArray(data.gaps).slice(0, 5),
      opportunities: ensureArray(data.opportunities || data.opportunity).slice(0, 5),
      confidence: typeof data.confidence === "number" ? Math.min(1, Math.max(0, data.confidence)) : 0.5,
      reasoning: typeof data.reasoning === "string" ? data.reasoning : "Analysis completed with standard weights."
    };
  } catch (err) {
    console.error("[Sanitize] Failed to parse LLM output:", err);
    throw new Error("SCHEMA_VIOLATION: Decision Engine output was unparseable.");
  }
}
