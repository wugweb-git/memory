export function compressDecisionHistory(items: Array<{ id: string; confidence: number }>, take = 50) {
  return [...items].sort((a, b) => b.confidence - a.confidence).slice(0, take);
}
