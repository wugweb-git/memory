import { decide, type DeciderOptions } from '@/lib/ai/decider';
import { checkBudget } from '@/lib/cost/guard';
import { recordJobUsage, type UsageStore } from '@/lib/cost/tracking';

/**
 * Optional signal-importance thresholding (opt-in: DECIDER_SIGNALS=1).
 * One Decisions request per packet, one yes/no question per signal. Signals the
 * Decider rates below DECIDER_SIGNALS_MIN (default 0.2) are dropped, except the
 * primary (first) signal. Anything unexpected (no key, API error, refusal) keeps
 * the signal, so the default behaviour is unchanged.
 */
export const DEFAULT_MIN_IMPORTANCE = 0.2;

export function isDeciderSignalsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DECIDER_SIGNALS === '1' && Boolean(env.OPENROUTER_API_KEY?.trim());
}

export function minImportance(env: NodeJS.ProcessEnv = process.env): number {
  const v = Number(env.DECIDER_SIGNALS_MIN);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : DEFAULT_MIN_IMPORTANCE;
}

interface SignalLike {
  type?: string;
  category?: string;
  metadata?: any;
}

export async function applySignalImportance<T extends SignalLike>(
  content: string,
  signals: T[],
  opts: DeciderOptions & { store?: UsageStore } = {},
): Promise<T[]> {
  const env = opts.env ?? process.env;
  if (!isDeciderSignalsEnabled(env) || signals.length === 0) return signals;
  // Background job: over its daily budget (or into the headroom reserved for ask/decision)
  // it makes no request and keeps every signal, exactly like any other Decider failure.
  const budget = await checkBudget('signals', { env, store: opts.store });
  if (!budget.allowed) return signals;
  try {
    const questions: Record<string, any> = {};
    signals.forEach((s, i) => {
      questions[`s${i}`] = {
        type: 'noul',
        instructions: `Is the "${s.type}" (${s.category}) signal important enough to keep in a personal activity timeline?`,
        criteria: {
          true: 'The content shows meaningful, specific personal or work activity.',
          false: 'The content is routine, boilerplate, or too thin to matter.',
        },
      };
    });
    const r = await decide({ content: content.slice(0, 2000) }, questions, opts);
    if (r.attempts?.length) await recordJobUsage('signals', r.attempts, opts.store).catch(() => {});
    if (!r.ok) return signals;
    const min = minImportance(env);
    const out: T[] = [];
    signals.forEach((s, i) => {
      const a = r.answers[`s${i}`];
      if (a?.type !== 'noul') {
        out.push(s);
        return;
      }
      const tagged = { ...s, metadata: { ...(s.metadata ?? {}), decider_importance: a.noul } } as T;
      if (i === 0 || a.noul >= min) out.push(tagged);
    });
    return out;
  } catch {
    return signals;
  }
}
