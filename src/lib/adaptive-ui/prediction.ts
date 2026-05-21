export interface AdaptivePredictionInput {
  directness?: number;
  verbosity?: number;
  executionFocus?: number;
  abstractionPreference?: number;
}

export interface AdaptivePredictionResult {
  uiDensity: "minimal" | "compact" | "dense";
  preferredOutputLength: "short" | "medium" | "long";
  preferredMode: "architect" | "founder" | "operator";
}

export function predictUiDensity(attentionSpan: number) {
  return attentionSpan < 0.4 ? "minimal" : attentionSpan < 0.7 ? "compact" : "dense";
}

export function predictAdaptiveUi(input: AdaptivePredictionInput): AdaptivePredictionResult {
  const uiDensity = (input.executionFocus ?? 0.5) > 0.7 ? "compact" : (input.abstractionPreference ?? 0.5) > 0.7 ? "dense" : "minimal";
  const preferredOutputLength = (input.verbosity ?? 0.5) > 0.66 ? "long" : (input.verbosity ?? 0.5) < 0.33 ? "short" : "medium";
  const preferredMode = (input.executionFocus ?? 0.5) > 0.65 ? "operator" : (input.abstractionPreference ?? 0.5) > 0.6 ? "architect" : "founder";
  return { uiDensity, preferredOutputLength, preferredMode };
}
