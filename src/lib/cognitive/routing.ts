/**
 * Cost routing (L3 Phase 4).
 * Pick the cheapest model that fits the job: a small model for thin context /
 * simple direction runs, a larger model for rich context or external-input
 * evaluation. Env `COGNITIVE_MODEL_FLOOR=mini` pins everything to the cheap tier.
 *
 * Two paths:
 * - OpenRouter (OPENROUTER_API_KEY set): the tier only orders the `decision`
 *   chain (src/lib/ai/models.ts). `selectModel` returns the real model that will
 *   be tried first (chain head after ordering), so traces/logs are honest.
 * - Legacy (no OpenRouter key): returns the old gpt-4o / gpt-4o-mini tier name.
 */
import { getChain, isOpenRouterEnabled, JOBS } from '@/lib/ai/models';

export type CognitiveModelTier = 'gpt-4o' | 'gpt-4o-mini';

export interface RoutingSignal {
  /** entities + signals + relationships count */
  contextSize: number;
  /** true for JD/brief/idea evaluation or other high-stakes runs */
  complex?: boolean;
}

/** `full` or `mini`; COGNITIVE_MODEL_FLOOR=mini always wins. */
export function selectTier(signal: RoutingSignal, env: NodeJS.ProcessEnv = process.env): 'full' | 'mini' {
  if (env.COGNITIVE_MODEL_FLOOR === 'mini') return 'mini';
  if (signal.complex) return 'full';
  if (signal.contextSize > 40) return 'full';
  return 'mini';
}

/** True when COGNITIVE_MODEL_FLOOR=mini (applies to both single-pass and multi-agent runs). */
export function isModelFloorMini(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.COGNITIVE_MODEL_FLOOR === 'mini';
}

/** Model that will be tried first for this signal: chain head on OpenRouter, legacy tier name otherwise. */
export function selectModel(signal: RoutingSignal, env: NodeJS.ProcessEnv = process.env): string {
  const tier = selectTier(signal, env);
  if (isOpenRouterEnabled(env)) return orderChainForTier(getChain('decision', env), tier)[0];
  return tier === 'full' ? 'gpt-4o' : 'gpt-4o-mini';
}

/** Cheap model for the reasoner step (always the mini tier). */
export function selectReasonerModel(env: NodeJS.ProcessEnv = process.env): string {
  if (isOpenRouterEnabled(env)) return orderChainForTier(getChain('decision', env), 'mini')[0];
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

/**
 * Env to hand to `runJob('decision', …, { env })` so `model` is tried first.
 * `model` is a name from `selectModel`/`selectReasonerModel`: a chain entry on
 * OpenRouter (moved to the front, rest kept as fallbacks). A legacy tier name
 * (gpt-4o*) that is not in the chain falls back to the tier mapping.
 */
export function openRouterEnvForModel(
  model: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv | undefined {
  const chain = getChain('decision', env);
  if (model && chain.includes(model)) {
    if (chain[0] === model) return undefined;
    return { ...env, [JOBS.decision.env]: [model, ...chain.filter((m) => m !== model)].join(',') };
  }
  return openRouterEnvForTier(isMiniTier(model) ? 'mini' : 'full', env);
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
