export function predictUiDensity(attentionSpan: number) {
  return attentionSpan < 0.4 ? "minimal" : attentionSpan < 0.7 ? "balanced" : "dense";
}
