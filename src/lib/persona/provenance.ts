export function scoreProvenance(params: { source: string; humanProbability: number; aiProbability: number }) {
  return {
    source: params.source,
    trust: Number((params.humanProbability - params.aiProbability * 0.5).toFixed(3)),
  };
}
