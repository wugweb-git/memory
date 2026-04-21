/**
 * Output Formatter
 * ----------------
 * Shapes the final decision for UI consumption.
 */

export function formatDecision(output: any, confidence: number) {
  return {
    recommendations: output.recommendations,
    priorities: output.priorities,
    gaps: output.gaps,
    reasoning: output.reasoning,
    confidence: confidence,
    timestamp: new Date().toISOString()
  };
}
