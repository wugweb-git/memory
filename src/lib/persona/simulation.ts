export function simulatePersonaDecision(input: { directness: number; analyticalDepth: number; urgency: number }) {
  const score = input.directness * 0.3 + input.analyticalDepth * 0.4 + input.urgency * 0.3;
  return { predictedBias: score > 0.65 ? "execute" : "analyze", score: Number(score.toFixed(3)) };
}
