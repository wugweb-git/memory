import { choice, type DeciderOptions } from '@/lib/ai/decider';

/**
 * Optional mode routing (opt-in: DECIDER_MODE=1). Only applies when the caller
 * did not pick a valid mode (missing, "auto", or unknown); an explicit
 * architect/founder/operator is always respected. Falls back to the given mode
 * (or "architect") on any failure.
 */
export const MODES = ['architect', 'founder', 'operator'] as const;
export type Mode = (typeof MODES)[number];

const OPTIONS: Record<Mode, string> = {
  architect: 'Systems, dependencies, structure and long-term technical decisions.',
  founder: 'Business outcomes, market fit, resource allocation and venture leverage.',
  operator: 'Execution, immediate next actions, blockers and daily momentum.',
};

export function isDeciderModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DECIDER_MODE === '1' && Boolean(env.OPENROUTER_API_KEY?.trim());
}

export function isValidMode(m: unknown): m is Mode {
  return typeof m === 'string' && (MODES as readonly string[]).includes(m);
}

export async function resolveMode(
  mode: unknown,
  ctx: { externalInput?: string | null; entities?: unknown[]; signals?: unknown[] },
  opts: DeciderOptions = {},
): Promise<{ mode: Mode | string; routed: boolean; model?: string }> {
  if (isValidMode(mode)) return { mode, routed: false };
  const fallback = typeof mode === 'string' && mode && mode !== 'auto' ? mode : 'architect';
  if (!isDeciderModeEnabled(opts.env ?? process.env)) return { mode: fallback, routed: false };
  const r = await choice(
    {
      request: ctx.externalInput ?? null,
      recent_entities: (ctx.entities ?? []).slice(0, 10),
      recent_signals: (ctx.signals ?? []).slice(0, 10),
    },
    'Which operating mode fits what the owner needs right now?',
    OPTIONS,
    { ...opts, fallback: 'architect' },
  );
  return r.ok ? { mode: r.choice, routed: true, model: r.model } : { mode: fallback, routed: false };
}
