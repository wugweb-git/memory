export function scoreRecommendation(signal: number, confidence: number) {
  return Number((signal * 0.7 + confidence * 0.3).toFixed(3));
}
