import { postgres } from '@/lib/db/postgres';
import { FEATURES, type FeatureKey } from '@/config/features';

const STATE_KEY = 'feature_flags';

/** Runtime feature overrides live in Neon (scheduler_state, key='feature_flags')
 *  so modules can be toggled from the System page without a deploy.
 *  Effective flags = static defaults/env (src/config/features.ts) merged with
 *  the stored overrides. */
export async function getRuntimeFeatures(): Promise<Record<FeatureKey, boolean>> {
  try {
    const row = await postgres.schedulerState.findUnique({ where: { key: STATE_KEY } });
    const overrides = (row?.value ?? {}) as Partial<Record<FeatureKey, boolean>>;
    return { ...FEATURES, ...overrides };
  } catch {
    // DB unreachable — fall back to static flags so the app shell still renders.
    return { ...FEATURES };
  }
}

/** Merge a partial set of overrides into the stored flags. */
export async function setRuntimeFeatures(
  patch: Partial<Record<FeatureKey, boolean>>,
): Promise<Record<FeatureKey, boolean>> {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(
      ([k, v]) => k in FEATURES && typeof v === 'boolean',
    ),
  ) as Partial<Record<FeatureKey, boolean>>;

  const row = await postgres.schedulerState.findUnique({ where: { key: STATE_KEY } });
  const existing = (row?.value ?? {}) as Partial<Record<FeatureKey, boolean>>;
  const next = { ...existing, ...clean };

  await postgres.schedulerState.upsert({
    where: { key: STATE_KEY },
    update: { value: next },
    create: { key: STATE_KEY, value: next },
  });

  return { ...FEATURES, ...next };
}
