/**
 * Cost routing (L3 Phase 4).
 * Pick the cheapest model that fits the job: a small model for thin context /
 * simple direction runs, a larger model for rich context or external-input
 * evaluation. Env `COGNITIVE_MODEL_FLOOR` can pin everything to the cheap tier.
 */
export type CognitiveModelTier = 'gpt-4o' | 'gpt-4o-mini';

export interface RoutingSignal {
  /** entities + signals + relationships count */
  contextSize: number;
  /** true for JD/brief/idea evaluation or other high-stakes runs */
  complex?: boolean;
}

export function selectModel(signal: RoutingSignal): CognitiveModelTier {
  if (process.env.COGNITIVE_MODEL_FLOOR === 'mini') return 'gpt-4o-mini';
  if (signal.complex) return 'gpt-4o';
  if (signal.contextSize > 40) return 'gpt-4o';
  return 'gpt-4o-mini';
}
