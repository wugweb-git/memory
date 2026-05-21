export interface ProvenanceSignalInput {
  aiProbability: number;
  humanProbability: number;
  verifiedHuman: boolean;
  sourceType?: string;
}

export interface ProvenanceSignalResult {
  trustScore: number;
  allowLearning: boolean;
  reason: string;
}

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export function detectAiLikelihood(text: string) {
  const heuristic = /(in today's world|delve into|moreover|furthermore)/i.test(text) ? 0.72 : 0.28;
  return { aiProbability: heuristic, humanProbability: Number((1 - heuristic).toFixed(3)) };
}

export function detectProvenanceSignal(input: ProvenanceSignalInput): ProvenanceSignalResult {
  const trustScore = clamp((input.humanProbability * 0.7) + (input.verifiedHuman ? 0.3 : -input.aiProbability * 0.3));
  if (!input.verifiedHuman && input.aiProbability > 0.55) {
    return { trustScore, allowLearning: false, reason: "ai_contamination_risk" };
  }
  return { trustScore, allowLearning: trustScore >= 0.55, reason: trustScore >= 0.55 ? "trusted" : "low_confidence" };
}
