/**
 * Perplexity Decider client (OpenRouter Decisions API, alpha).
 *
 * Endpoint and shapes taken from OpenRouter's OpenAPI spec
 * (https://openrouter.ai/openapi.json, path `/api/alpha/decisions`, operation
 * `createApiAlphaDecisions`): POST {model, state, questions} where each question is
 *   - {type:'noul', instructions?, criteria?:{true,false}}      -> {noul: P(true), confidence?}
 *   - {type:'choice', instructions?, criteria:{option:desc}}     -> {choice, confidence?, probabilities?}
 *   - {type:'score', instructions?, criteria:[ordered rubric]}   -> {score, confidence?, probabilities?, legend?}
 * A question may also come back as {type:'refusal'}. The API is marked "Alpha: the shape may change",
 * so every parser here is tolerant and every helper falls back to a safe default.
 *
 * Only called when OPENROUTER_API_KEY is set. Never throws from the typed helpers.
 */
import { isOpenRouterEnabled } from './models';

export const DECIDER_ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';
/** Tried in order, each at most once. Override with DECIDER_MODELS (comma-separated). */
export const DECIDER_DEFAULT_MODELS = [
  'perplexity/pplx-decider-flash-v1.3:free',
  'perplexity/pplx-decider-v1.3:free',
];

export type DeciderState = string | Record<string, unknown> | unknown[];

export type DeciderQuestion =
  | { type: 'noul'; instructions?: string; criteria?: { true?: string; false?: string } }
  | { type: 'choice'; instructions?: string; criteria: Record<string, string> }
  | { type: 'score'; instructions?: string; criteria: string[] };

export type DeciderAnswer =
  | { type: 'noul'; noul: number; confidence?: number }
  | { type: 'choice'; choice: string; confidence?: number; probabilities?: Record<string, number> }
  | { type: 'score'; score: number; confidence?: number; probabilities?: Record<string, number>; legend?: Record<string, unknown> }
  | { type: 'refusal' };

export interface DeciderOptions {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface DecideResult {
  ok: boolean;
  model?: string;
  answers: Record<string, DeciderAnswer>;
  reason?: string;
}

export function deciderModels(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.DECIDER_MODELS;
  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length) return [...new Set(list)];
  }
  return [...DECIDER_DEFAULT_MODELS];
}

export function isDeciderAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return isOpenRouterEnabled(env);
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Tolerantly normalise one raw answer; returns undefined if unusable. */
export function parseAnswer(raw: any): DeciderAnswer | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  switch (raw.type) {
    case 'noul': {
      const p = num(raw.noul);
      return p === undefined ? undefined : { type: 'noul', noul: Math.min(1, Math.max(0, p)), confidence: num(raw.confidence) };
    }
    case 'choice':
      return typeof raw.choice === 'string'
        ? { type: 'choice', choice: raw.choice, confidence: num(raw.confidence), probabilities: raw.probabilities && typeof raw.probabilities === 'object' ? raw.probabilities : undefined }
        : undefined;
    case 'score': {
      const s = num(raw.score);
      return s === undefined
        ? undefined
        : { type: 'score', score: s, confidence: num(raw.confidence), probabilities: raw.probabilities && typeof raw.probabilities === 'object' ? raw.probabilities : undefined, legend: raw.legend };
    }
    case 'refusal':
      return { type: 'refusal' };
    default:
      return undefined;
  }
}

/**
 * Low-level call. Tries each model once; never throws. `ok:false` carries a reason
 * (`no_key`, `http_429`, `timeout`, `invalid_response`, ...) and empty answers.
 */
export async function decide(
  state: DeciderState,
  questions: Record<string, DeciderQuestion>,
  opts: DeciderOptions = {},
): Promise<DecideResult> {
  const env = opts.env ?? process.env;
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key) return { ok: false, answers: {}, reason: 'no_key' };
  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 20000;
  let lastReason = 'no_models';

  for (const model of deciderModels(env)) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    opts.signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
    try {
      const res = await doFetch(DECIDER_ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': env.OPENROUTER_REFERER || 'https://www.vedanshusrivastava.com',
          'X-Title': 'Identity Prism',
        },
        body: JSON.stringify({ model, state, questions }),
      });
      if (!res.ok) {
        lastReason = res.status === 429 ? 'http_429' : `http_${res.status}`;
        continue;
      }
      const data: any = await res.json().catch(() => null);
      const rawAnswers = data?.answers;
      if (!rawAnswers || typeof rawAnswers !== 'object') {
        lastReason = 'invalid_response';
        continue;
      }
      const answers: Record<string, DeciderAnswer> = {};
      for (const [k, v] of Object.entries(rawAnswers)) {
        const a = parseAnswer(v);
        if (a) answers[k] = a;
      }
      if (Object.keys(answers).length === 0) {
        lastReason = 'invalid_response';
        continue;
      }
      return { ok: true, model: typeof data.model === 'string' ? data.model : model, answers };
    } catch (err: any) {
      lastReason = err?.name === 'AbortError' ? 'timeout' : 'network';
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, answers: {}, reason: lastReason };
}

export interface YesNoResult { ok: boolean; probability: number; confidence?: number; model?: string; reason?: string }
export interface ChoiceResult { ok: boolean; choice: string; probabilities?: Record<string, number>; confidence?: number; model?: string; reason?: string }
export interface ScoreResult { ok: boolean; score: number; confidence?: number; model?: string; reason?: string }

/** Probability that the statement/question is true. Fallback probability defaults to 0.5. */
export async function yesNo(
  state: DeciderState,
  instructions: string,
  opts: DeciderOptions & { criteria?: { true?: string; false?: string }; fallback?: number } = {},
): Promise<YesNoResult> {
  const fallback = opts.fallback ?? 0.5;
  const r = await decide(state, { q: { type: 'noul', instructions, criteria: opts.criteria } }, opts);
  const a = r.answers.q;
  if (r.ok && a?.type === 'noul') return { ok: true, probability: a.noul, confidence: a.confidence, model: r.model };
  return { ok: false, probability: fallback, reason: r.ok ? 'refusal_or_mismatch' : r.reason };
}

/** Pick one of the option keys. Fallback defaults to `opts.fallback` or the first option. */
export async function choice(
  state: DeciderState,
  instructions: string,
  options: Record<string, string>,
  opts: DeciderOptions & { fallback?: string } = {},
): Promise<ChoiceResult> {
  const keys = Object.keys(options);
  const fallback = opts.fallback ?? keys[0] ?? '';
  const r = await decide(state, { q: { type: 'choice', instructions, criteria: options } }, opts);
  const a = r.answers.q;
  if (r.ok && a?.type === 'choice' && keys.includes(a.choice)) {
    return { ok: true, choice: a.choice, probabilities: a.probabilities, confidence: a.confidence, model: r.model };
  }
  return { ok: false, choice: fallback, reason: r.ok ? 'refusal_or_mismatch' : r.reason };
}

/** Score on an ordered rubric (index 0 = lowest). Fallback defaults to the rubric midpoint. */
export async function score(
  state: DeciderState,
  instructions: string,
  rubric: string[],
  opts: DeciderOptions & { fallback?: number } = {},
): Promise<ScoreResult> {
  const fallback = opts.fallback ?? (rubric.length - 1) / 2;
  const r = await decide(state, { q: { type: 'score', instructions, criteria: rubric } }, opts);
  const a = r.answers.q;
  if (r.ok && a?.type === 'score') return { ok: true, score: a.score, confidence: a.confidence, model: r.model };
  return { ok: false, score: fallback, reason: r.ok ? 'refusal_or_mismatch' : r.reason };
}
