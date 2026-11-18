import {
  getChain,
  jobNeedsJson,
  supportsJsonMode,
  isOpenRouterEnabled,
  type JobName,
} from './models';

export { isOpenRouterEnabled };

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const REFERER = 'https://www.vedanshusrivastava.com';
const TITLE = 'Identity Prism';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RunJobOptions {
  temperature?: number;
  maxTokens?: number;
  /** Per-attempt timeout in ms (default 25000). */
  timeoutMs?: number;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
  /** Override env (tests). */
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  /** Force JSON (true) or plain-text (false) handling regardless of the job default. */
  json?: boolean;
}

export interface Attempt {
  model: string;
  ok: boolean;
  status?: number;
  reason?: string;
  ms: number;
}

export interface JobResult {
  text: string;
  model: string;
  attempts: Attempt[];
}

export class JobFailedError extends Error {
  attempts: Attempt[];
  constructor(job: string, attempts: Attempt[]) {
    super(`OPENROUTER_JOB_FAILED(${job}): ${attempts.map((a) => `${a.model}=${a.reason}`).join('; ')}`);
    this.name = 'JobFailedError';
    this.attempts = attempts;
  }
}

/** Strip code fences / prose and parse the first JSON object or array. Returns undefined if none. */
export function parseTolerantJson(text: string): unknown | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  const candidates: string[] = [trimmed];
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());
  const firstObj = trimmed.indexOf('{');
  const lastObj = trimmed.lastIndexOf('}');
  if (firstObj !== -1 && lastObj > firstObj) candidates.push(trimmed.slice(firstObj, lastObj + 1));
  const firstArr = trimmed.indexOf('[');
  const lastArr = trimmed.lastIndexOf(']');
  if (firstArr !== -1 && lastArr > firstArr) candidates.push(trimmed.slice(firstArr, lastArr + 1));
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function extractContent(data: any): string {
  const c = data?.choices?.[0]?.message?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('');
  return '';
}

/**
 * Run a job against its model chain. Falls to the next model on 429, 5xx,
 * timeout, network error, empty content, or (JSON jobs) unparseable output.
 * Each model is tried at most once, so attempts <= chain length.
 * For JSON jobs the returned text is normalised JSON (fences/prose stripped).
 */
export async function runJob(job: JobName, messages: ChatMessage[], opts: RunJobOptions = {}): Promise<JobResult> {
  const env = opts.env ?? process.env;
  const key = env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');
  const doFetch = opts.fetchImpl ?? fetch;
  const chain = getChain(job, env);
  const wantJson = opts.json ?? jobNeedsJson(job);
  const timeoutMs = opts.timeoutMs ?? 25000;
  const attempts: Attempt[] = [];

  for (const model of chain) {
    const started = Date.now();
    const record = (a: Omit<Attempt, 'model' | 'ms'>) =>
      attempts.push({ model, ms: Date.now() - started, ...a });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    opts.signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: opts.temperature ?? (wantJson ? 0.1 : 0.7),
      };
      if (opts.maxTokens) body.max_tokens = opts.maxTokens;
      if (wantJson && supportsJsonMode(model)) body.response_format = { type: 'json_object' };

      const res = await doFetch(ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': env.OPENROUTER_REFERER || REFERER,
          'X-Title': TITLE,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        record({ ok: false, status: res.status, reason: res.status === 429 ? 'rate_limited' : `http_${res.status}` });
        continue; // 429/5xx/other: next model, never retry the same one
      }
      const data = await res.json().catch(() => null);
      const text = extractContent(data).trim();
      if (!text) {
        record({ ok: false, status: res.status, reason: 'empty' });
        continue;
      }
      if (wantJson) {
        const parsed = parseTolerantJson(text);
        if (parsed === undefined) {
          record({ ok: false, status: res.status, reason: 'invalid_json' });
          continue;
        }
        record({ ok: true, status: res.status });
        return { text: JSON.stringify(parsed), model, attempts };
      }
      record({ ok: true, status: res.status });
      return { text, model, attempts };
    } catch (err: any) {
      record({ ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new JobFailedError(job, attempts);
}
