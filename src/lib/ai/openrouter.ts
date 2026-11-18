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
  /** Per-attempt timeout in ms (default 18000). */
  timeoutMs?: number;
  /** Total time budget across the whole chain in ms (default 52000, inside a 60s function limit). */
  budgetMs?: number;
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
  const timeoutMs = opts.timeoutMs ?? 18000;
  const budgetMs = opts.budgetMs ?? 52000;
  const chainStart = Date.now();
  const attempts: Attempt[] = [];

  for (const model of chain) {
    if (opts.signal?.aborted) break;
    const remaining = budgetMs - (Date.now() - chainStart);
    if (remaining < 3000) break; // not enough time left for a useful attempt
    const started = Date.now();
    const record = (a: Omit<Attempt, 'model' | 'ms'>) =>
      attempts.push({ model, ms: Date.now() - started, ...a });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(timeoutMs, remaining));
    const onAbort = () => ctrl.abort();
    opts.signal?.addEventListener('abort', onAbort, { once: true });
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
      opts.signal?.removeEventListener('abort', onAbort);
    }
  }
  throw new JobFailedError(job, attempts);
}

export interface StreamJobOptions extends Omit<RunJobOptions, 'json'> {
  /** Called once with the model that produced the first token, before the first delta is yielded. */
  onModel?: (model: string) => void;
  /** Called with the attempt log when the stream finishes or fails. */
  onAttempts?: (attempts: Attempt[]) => void;
}

/** Pull the text delta out of one parsed SSE payload ('' if none). */
function extractDelta(data: any): string {
  const c = data?.choices?.[0]?.delta?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('');
  return '';
}

/**
 * Stream a job's answer as text deltas (OpenRouter OpenAI-compatible SSE).
 * Fallback rule: a model that fails (non-2xx, 429, timeout, network, empty
 * stream, upstream error) BEFORE its first token moves to the next model in
 * the chain. Once a token has been yielded the model is never switched; a
 * later failure just ends the stream with what was already sent.
 * Throws JobFailedError only when every model failed before any token.
 * Budget: timeoutMs per attempt to first token, budgetMs total.
 */
export async function* streamJob(
  job: JobName,
  messages: ChatMessage[],
  opts: StreamJobOptions = {},
): AsyncGenerator<string, void, void> {
  const env = opts.env ?? process.env;
  const key = env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');
  const doFetch = opts.fetchImpl ?? fetch;
  const chain = getChain(job, env);
  const timeoutMs = opts.timeoutMs ?? 18000;
  const budgetMs = opts.budgetMs ?? 52000;
  const chainStart = Date.now();
  const attempts: Attempt[] = [];

  try {
    for (const model of chain) {
      if (opts.signal?.aborted) break;
      const remaining = budgetMs - (Date.now() - chainStart);
      if (remaining < 3000) break;
      const started = Date.now();
      const record = (a: Omit<Attempt, 'model' | 'ms'>) =>
        attempts.push({ model, ms: Date.now() - started, ...a });
      const ctrl = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => ctrl.abort(), Math.min(timeoutMs, remaining));
      const onAbort = () => ctrl.abort();
      opts.signal?.addEventListener('abort', onAbort, { once: true });
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let emitted = false;
      try {
        const body: Record<string, unknown> = {
          model,
          messages,
          stream: true,
          temperature: opts.temperature ?? 0.7,
        };
        if (opts.maxTokens) body.max_tokens = opts.maxTokens;

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
          continue;
        }
        if (!res.body) {
          record({ ok: false, status: res.status, reason: 'empty' });
          continue;
        }
        reader = res.body.getReader();
        // A stalled body must not outlive the timers/abort signal: cancelling the reader ends the pending read.
        const activeReader = reader;
        const stopRead = () => void activeReader.cancel().catch(() => {});
        if (ctrl.signal.aborted) stopRead();
        else ctrl.signal.addEventListener('abort', stopRead, { once: true });
        const decoder = new TextDecoder();
        let buf = '';
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buf += decoder.decode(chunk.value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, nl).replace(/\r$/, '').trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue; // blank lines, ': OPENROUTER PROCESSING' comments
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              done = true;
              break;
            }
            let parsed: any;
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }
            if (parsed?.error) {
              if (!emitted) throw new Error('upstream_error');
              done = true; // mid-stream error: keep what was sent
              break;
            }
            const delta = extractDelta(parsed);
            if (!delta) continue;
            if (!emitted) {
              emitted = true;
              // First token: the per-attempt timer is done; only the total budget applies now.
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => ctrl.abort(), Math.max(0, budgetMs - (Date.now() - chainStart)));
              record({ ok: true, status: res.status });
              opts.onModel?.(model);
            }
            yield delta;
          }
        }
        if (!emitted) {
          record({ ok: false, status: res.status, reason: ctrl.signal.aborted ? 'timeout' : 'empty' });
          continue;
        }
        return;
      } catch (err: any) {
        if (emitted) return; // never switch models after a token; end with what was sent
        record({
          ok: false,
          reason: err?.name === 'AbortError' ? 'timeout' : err?.message === 'upstream_error' ? 'upstream_error' : 'network',
        });
      } finally {
        if (timer) clearTimeout(timer);
        opts.signal?.removeEventListener('abort', onAbort);
        if (reader) {
          try {
            await reader.cancel();
          } catch {
            /* already closed */
          }
        }
      }
    }
    throw new JobFailedError(job, attempts);
  } finally {
    opts.onAttempts?.(attempts);
  }
}
