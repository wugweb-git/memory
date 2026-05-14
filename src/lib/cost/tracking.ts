export function estimateTokenUsage(text: string) {
  const tokens = Math.ceil(text.length / 4);
  return { promptTokens: tokens, completionTokens: 0, totalTokens: tokens };
}

export function estimateModelCost(totalTokens: number, per1k = 0.01) {
  return Number(((totalTokens / 1000) * per1k).toFixed(6));
}
