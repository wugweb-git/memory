export function runTwinSimulation(input: { behaviorScore: number; contextPressure: number }) {
  return { predictedMode: input.contextPressure > 0.7 ? "operator" : "architect", confidence: Number((0.5 + input.behaviorScore * 0.4).toFixed(3)) };
}
