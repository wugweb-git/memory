export function arbitrateModelOutputs(outputs: Array<{ model: string; confidence: number }>) {
  return [...outputs].sort((a, b) => b.confidence - a.confidence)[0] || null;
}
