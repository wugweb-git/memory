export function critiqueDecision(reasoning: string) {
  return { passed: reasoning.length > 20, notes: "basic critic check" };
}
