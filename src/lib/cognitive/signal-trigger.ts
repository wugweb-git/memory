/**
 * Signal-spike trigger (L3 Phase 4, opt-in via COGNITIVE_SIGNAL_TRIGGER=1).
 *
 * Called by the L2 pipeline after signals are written. A high-intensity signal
 * queues one cognitive run so the brain reacts to momentum shifts.
 * Guarantees: never throws, bounded (timeout), deduped + rate limited
 * (min interval and a per-day cap, kept under the free-model cap of ~50/day),
 * read-only toward lower layers (processDecision only writes decision logs).
 */
export interface SpikeSignal {
  intensity_absolute?: number | null;
}

export type TriggerResult =
  | { triggered: true; decisionId?: string }
  | { triggered: false; reason: 'disabled' | 'not_prod' | 'no_spike' | 'deduped' | 'daily_cap' | 'error' | 'timeout' };

export interface TriggerDeps {
  checkRateLimit: (key: string, limit: number, windowMs: number) => Promise<{ allowed: boolean }>;
  run: (userId: string) => Promise<any>;
}

/** Inclusive: signal intensity is capped at 0.9, so a strict > could never fire. */
export const SPIKE_THRESHOLD = 0.9;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const RUN_TIMEOUT_MS = 45_000;
const HARD_DAILY_MAX = 50;

function dailyCap(env: NodeJS.ProcessEnv): number {
  const n = Number.parseInt(env.COGNITIVE_SIGNAL_TRIGGER_DAILY_CAP ?? '', 10);
  const v = Number.isFinite(n) && n > 0 ? n : 10;
  return Math.min(v, HARD_DAILY_MAX);
}

export function hasSpike(signals: SpikeSignal[] | undefined | null): boolean {
  return Boolean(signals?.some((s) => (s?.intensity_absolute ?? 0) >= SPIKE_THRESHOLD));
}

async function defaultDeps(): Promise<TriggerDeps> {
  const [{ checkRateLimit }, { processDecision }] = await Promise.all([
    import('@/lib/security/rate-limit'),
    import('./orchestrator'),
  ]);
  return {
    checkRateLimit,
    run: (userId) => processDecision({ userId, mode: 'operator', external_input: null }),
  };
}

export async function maybeTriggerCognitiveRun(
  params: { userId: string; signals: SpikeSignal[]; testRunId?: string | null },
  opts: { env?: NodeJS.ProcessEnv; deps?: TriggerDeps; timeoutMs?: number } = {},
): Promise<TriggerResult> {
  const env = opts.env ?? process.env;
  try {
    if (env.COGNITIVE_SIGNAL_TRIGGER !== '1') return { triggered: false, reason: 'disabled' };
    if (params.testRunId !== 'PROD') return { triggered: false, reason: 'not_prod' };
    if (!hasSpike(params.signals)) return { triggered: false, reason: 'no_spike' };

    const deps = opts.deps ?? (await defaultDeps());
    // Dedupe: at most one spike-run per hour per user (a burst of packets = one run).
    const hourly = await deps.checkRateLimit(`cognitive:signal-trigger:hour:${params.userId}`, 1, HOUR);
    if (!hourly.allowed) return { triggered: false, reason: 'deduped' };
    const daily = await deps.checkRateLimit(`cognitive:signal-trigger:day:${params.userId}`, dailyCap(env), DAY);
    if (!daily.allowed) return { triggered: false, reason: 'daily_cap' };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), opts.timeoutMs ?? RUN_TIMEOUT_MS);
    });
    try {
      const res = await Promise.race([deps.run(params.userId), timeout]);
      if (res === 'timeout') return { triggered: false, reason: 'timeout' };
      return { triggered: true, decisionId: (res as any)?.decision_id };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    console.error('[SignalTrigger] cognitive run failed:', err);
    return { triggered: false, reason: 'error' };
  }
}
