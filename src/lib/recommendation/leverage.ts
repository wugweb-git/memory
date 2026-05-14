export function leverageScore(impact: number, effort: number) {
  return Number((impact / Math.max(0.1, effort)).toFixed(3));
}
