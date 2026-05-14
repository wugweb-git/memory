export function suppressNoise(items: Array<{ id: string; score: number }>, threshold = 0.4) {
  return items.filter((i) => i.score >= threshold);
}
