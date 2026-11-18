/**
 * Per-job model registry (OpenRouter free chains).
 * Each job has an ordered chain: first model is tried first, the rest are
 * fallbacks. Override any chain in Vercel env with a comma-separated list,
 * e.g. ASK_MODELS="vendor/model-a:free,vendor/model-b:free".
 */
export type JobName = 'ask' | 'decision' | 'signals' | 'summary' | 'ingest';

export interface JobSpec {
  /** Env var holding a comma-separated ordered override. */
  env: string;
  /** Default free chain (OpenRouter IDs). */
  defaults: string[];
  /** The caller needs parseable JSON back. */
  json: boolean;
}

export const JOBS: Record<JobName, JobSpec> = {
  ask: {
    env: 'ASK_MODELS',
    json: false,
    defaults: [
      'nvidia/nemotron-3.5-lightning:free',
      'google/gemma-4-26b-a4b-it:free',
      'particle-ai/particle-1:free',
    ],
  },
  decision: {
    env: 'DECISION_MODELS',
    json: true,
    defaults: [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-31b-it:free',
      'inclusionai/ling-3.2-flash:free',
    ],
  },
  signals: {
    env: 'SIGNALS_MODELS',
    json: true,
    defaults: [
      'liquid/lfm-3-1.7b:free',
      'recursive/flint-v1.0:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    ],
  },
  summary: {
    env: 'SUMMARY_MODELS',
    json: false,
    defaults: ['inclusionai/ling-3.2-flash:free', 'google/gemma-4-26b-a4b-it:free'],
  },
  ingest: {
    env: 'INGEST_MODELS',
    json: true,
    defaults: [
      'cohere/north-mini-code:free',
      'google/gemma-4-26b-a4b-it:free',
      'dots-studio/dots-3-note-preview:free',
    ],
  },
};

/** Models that list response_format JSON support on OpenRouter. Others get tolerant text parsing. */
export const JSON_MODE_MODELS = new Set<string>([
  'inclusionai/ling-3.2-flash:free',
  'liquid/lfm-3-1.7b:free',
  'particle-ai/particle-1:free',
  'recursive/flint-v1.0:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'dots-studio/dots-3-note-preview:free',
]);

export function supportsJsonMode(model: string): boolean {
  return JSON_MODE_MODELS.has(model);
}

/** Parse a comma-separated model list: trims, drops empties and duplicates. */
export function parseModelList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export function getChain(job: JobName, env: NodeJS.ProcessEnv = process.env): string[] {
  const spec = JOBS[job];
  const override = parseModelList(env[spec.env]);
  return override.length ? override : [...spec.defaults];
}

export function jobNeedsJson(job: JobName): boolean {
  return JOBS[job].json;
}

export function isOpenRouterEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim());
}
