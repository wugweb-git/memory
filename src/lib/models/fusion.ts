export function confidenceFusion(scores: number[]) {
  if (!scores.length) return 0;
  return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3));
}
