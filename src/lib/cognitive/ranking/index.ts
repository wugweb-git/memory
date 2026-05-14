export function rankRecommendationsByImpact(items: Array<{ id: string; impact: number }>) {
  return [...items].sort((a, b) => b.impact - a.impact);
}
