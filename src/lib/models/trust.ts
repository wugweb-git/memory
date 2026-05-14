export function modelTrustScore(reliability: number, hallucinationRisk: number, costEfficiency: number) {
  return Number((reliability * 0.5 + (1 - hallucinationRisk) * 0.3 + costEfficiency * 0.2).toFixed(3));
}
