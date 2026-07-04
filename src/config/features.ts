/**
 * MVP feature flags — single switchboard for enabling/disabling modules.
 *
 * Flip a flag to `false` to hide that module from navigation (and, where wired,
 * short-circuit its API routes). Nothing is deleted — set back to `true` to
 * restore. `core` surfaces (Console, Output studio, Portfolio, Profile) have no
 * flag and are always on.
 *
 * Env override: set `FEATURE_<KEY>=off` (or `0`/`false`) to disable without a
 * code change, e.g. `FEATURE_COGNITIVE=off`.
 */
export type FeatureKey =
  | 'ask'
  | 'memory'
  | 'buffer'
  | 'history'
  | 'cognitive'
  | 'persona'
  | 'career'
  | 'system'
  | 'admin';

const DEFAULTS: Record<FeatureKey, boolean> = {
  ask: true,
  memory: true,
  buffer: true,
  history: true,
  cognitive: true,
  persona: true,
  career: true,
  system: true,
  admin: true,
};

function envOverride(key: FeatureKey): boolean | undefined {
  const raw = process.env[`FEATURE_${key.toUpperCase()}`];
  if (raw === undefined) return undefined;
  return !['off', '0', 'false', 'no'].includes(raw.toLowerCase());
}

export const FEATURES: Record<FeatureKey, boolean> = Object.fromEntries(
  (Object.keys(DEFAULTS) as FeatureKey[]).map((k) => [k, envOverride(k) ?? DEFAULTS[k]]),
) as Record<FeatureKey, boolean>;

/** True when a feature is enabled (unknown/undefined keys are treated as core → on). */
export function featureEnabled(key?: FeatureKey): boolean {
  if (!key) return true;
  return FEATURES[key] ?? true;
}
