/**
 * Confidence Engine (L3.3)
 * ------------------------
 * Heuristic-based engine that calculates a real confidence score
 * based on the richness of the input context.
 */

export function computeConfidence(output: any, context: any) {
  let score = output.confidence || 0.5;

  // Richness heuristics
  if ((context.entities?.length || 0) > 10) score += 0.1;
  if ((context.signals?.length || 0) > 5) score += 0.1;
  
  // Penalties
  if (output.recommendations?.length < 2) score -= 0.1;
  
  return Math.min(1, Math.max(0.1, score));
}
