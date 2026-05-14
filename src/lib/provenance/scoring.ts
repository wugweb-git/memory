export function humanAuthenticityScore(humanProbability: number, verified = false) {
  return Number(Math.min(1, humanProbability + (verified ? 0.1 : 0)).toFixed(3));
}
