export function rankSemanticMatches(items: Array<{ id: string; score: number }>) {
  return [...items].sort((a, b) => b.score - a.score);
}
