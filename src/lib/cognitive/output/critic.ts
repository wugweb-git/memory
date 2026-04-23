/**
 * Critic Engine (L3 Phase 2)
 * ---------------------------
 * Validates LLM output for hallucination, generic advice,
 * and confidence integrity. Has veto power over the pipeline.
 */

export interface CriticReport {
  approved: boolean;
  issues: string[];
  confidence_penalty: number;
}

const GENERIC_PHRASES = [
  'be consistent', 'stay focused', 'keep going', 'work harder',
  'be strategic', 'stay motivated', 'be proactive'
];

export function runCritic(output: any, context: any): CriticReport {
  const issues: string[] = [];
  let penalty = 0;

  const contextTerms = [
    ...(context.entities || []).map((e: any) => e.name?.toLowerCase()),
    ...(context.signals  || []).map((s: any) => s.type?.toLowerCase()),
  ].filter(Boolean);

  // 1. Grounding check
  const ungrounded = (output.recommendations || []).filter((rec: string) => {
    const lower = rec.toLowerCase();
    return contextTerms.length > 0 && !contextTerms.some(t => lower.includes(t));
  });
  if (ungrounded.length > 2) {
    issues.push(`${ungrounded.length} recommendations not grounded in context`);
    penalty += 0.2;
  }

  // 2. Generic advice
  const generic = (output.recommendations || []).filter((rec: string) =>
    GENERIC_PHRASES.some(g => rec.toLowerCase().includes(g))
  );
  if (generic.length > 0) {
    issues.push(`${generic.length} generic recommendations detected`);
    penalty += 0.15;
  }

  // 3. Overconfidence with thin data
  if (output.confidence > 0.8 && (context.signals || []).length < 3) {
    issues.push('Overconfident given thin signal data');
    penalty += 0.1;
  }

  const finalConfidence = Math.max(0.1, (output.confidence || 0.5) - penalty);

  return {
    approved: finalConfidence >= 0.35 && issues.length < 3,
    issues,
    confidence_penalty: penalty
  };
}
