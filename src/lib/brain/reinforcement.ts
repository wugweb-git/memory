export function reinforcementScore(accessCount: number, outcomeScore: number) {
  return Number(Math.min(1, accessCount * 0.05 + outcomeScore * 0.6).toFixed(3));
}
