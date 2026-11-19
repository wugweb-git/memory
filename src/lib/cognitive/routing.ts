/**
 * Cost routing (L3 Phase 4).
 * Pick the cheapest model that fits the job: a small model for thin context /
 * simple direction runs, a larger model for rich context or external-input
 * evaluation. Env `COGNITIVE_MODEL_FLOOR` can pin everything to the cheap tier.
 */
import { getChain, JOBS } from '@/lib/ai/models';

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

/**
 * Tier -> OpenRouter chain mapping.
 * Under OpenRouter the brain never uses the legacy `gpt-4o*` ids; it runs the
 * per-job `decision` chain (src/lib/ai/models.ts). The tier therefore selects
 * the chain *order*: `full` keeps the configured order (strongest model first),
 * `mini` promotes the last (lightest/cheapest) entry to the front and keeps
 * the rest as fallbacks. Overrides via DECISION_MODELS are respected.
 */
export function isMiniTier(modelName: string | undefined): boolean {
  return Boolean(modelName && /mini/i.test(modelName));
}

export function orderChainForTier(chain: string[], tier: 'full' | 'mini'): string[] {
  if (tier === 'full' || chain.length < 2) return [...chain];
  return [chain[chain.length - 1], ...chain.slice(0, -1)];
}

/** Env to hand to `runJob('decision', …, { env })` for the given tier, or undefined to use process.env as-is. */
export function openRouterEnvForTier(
  tier: 'full' | 'mini',
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv | undefined {
  if (tier === 'full') return undefined;
  const ordered = orderChainForTier(getChain('decision', env), 'mini');
  return { ...env, [JOBS.decision.env]: ordered.join(',') };
}
