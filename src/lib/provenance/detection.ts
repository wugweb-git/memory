export function detectAiLikelihood(text: string) {
  const heuristic = /(in today's world|delve into|moreover|furthermore)/i.test(text) ? 0.72 : 0.28;
  return { aiProbability: heuristic, humanProbability: Number((1 - heuristic).toFixed(3)) };
}
