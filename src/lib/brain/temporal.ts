export function temporalLinkScore(daysApart: number, topicalSimilarity: number) {
  const recency = Math.max(0, 1 - daysApart / 365);
  return Number((recency * 0.5 + topicalSimilarity * 0.5).toFixed(3));
}
