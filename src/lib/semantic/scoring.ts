export function relationshipStrength(occurrences: number, confidence: number) {
  return Number(Math.min(1, (occurrences / 10) * 0.6 + confidence * 0.4).toFixed(3));
}
