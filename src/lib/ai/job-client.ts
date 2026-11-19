import { runJob, type ChatMessage, type JobResult, type RunJobOptions } from './openrouter';
import type { JobName } from './models';
import { BudgetExceededError, checkBudget, type BudgetDecision } from '@/lib/cost/guard';
import { recordJobUsage, type UsageStore } from '@/lib/cost/tracking';

/**
 * Minimal LangChain-shaped client (`call(messages) -> { content }`) backed by a
 * job chain, so call sites that take an injectable `llmClient` can be routed
 * per job without code changes. `lastModel` reports the model that answered.
 */
export interface JobClient {
  lastModel?: string;
  /** Set when the last call was skipped by the daily budget guard. */
  lastSkip?: BudgetDecision;
  call(messages: Array<{ content: unknown; _getType?: () => string }>): Promise<{ content: string }>;
}

export function toChatMessages(messages: Array<{ content: unknown; _getType?: () => string }>): ChatMessage[] {
  return messages.map((m) => {
    const t = typeof m._getType === 'function' ? m._getType() : 'human';
    const role: ChatMessage['role'] = t === 'system' ? 'system' : t === 'ai' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return { role, content };
  });
}

export interface GuardOptions {
  /** Inject a usage store (tests). Defaults to Neon scheduler_state. */
  store?: UsageStore;
  now?: Date;
  /** Inject the underlying call (tests). Defaults to runJob. */
  run?: typeof runJob;
}

/** Typed outcome of a budget-guarded job call. A skipped call made no request. */
export type GuardedJobResult =
  | ({ ok: true; skipped: false } & JobResult)
  | { ok: false; skipped: true; job: JobName; decision: BudgetDecision; message: string };

/**
 * runJob behind the daily budget guard. Over budget it makes NO request and
 * returns `{ ok:false, skipped:true }` so the caller can take its rule-based
 * fallback. Provider failures still throw JobFailedError as before. Usage is
 * recorded (awaited, best effort) after every real call, success or failure.
 */
export async function runJobGuarded(
  job: JobName,
  messages: ChatMessage[],
  opts: RunJobOptions & GuardOptions = {},
): Promise<GuardedJobResult> {
  const { store, now, run = runJob, ...runOpts } = opts;
  const decision = await checkBudget(job, { env: runOpts.env, store, now });
  if (!decision.allowed) {
    return { ok: false, skipped: true, job, decision, message: decision.message ?? `Daily ${job} budget exhausted` };
  }
  try {
    const r = await run(job, messages, runOpts);
    await recordJobUsage(job, r.attempts, store, now).catch(() => {});
    return { ok: true, skipped: false, ...r };
  } catch (err) {
    const attempts = (err as { attempts?: Array<{ model: string; ok: boolean }> })?.attempts;
    if (attempts?.length) await recordJobUsage(job, attempts, store, now).catch(() => {});
    throw err;
  }
}

/**
 * Like runJobGuarded but throws BudgetExceededError when skipped. For call sites
 * with no fallback of their own: interactive jobs surface the clear message,
 * background callers that already catch errors fall back as before.
 */
export async function runJobOrThrow(
  job: JobName,
  messages: ChatMessage[],
  opts: RunJobOptions & GuardOptions = {},
): Promise<JobResult> {
  const r = await runJobGuarded(job, messages, opts);
  if (r.skipped) throw new BudgetExceededError(r.decision);
  return r;
}

export function createJobClient(
  job: JobName,
  opts: { temperature?: number; fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } & GuardOptions = {},
): JobClient {
  const client: JobClient = {
    async call(messages) {
      client.lastSkip = undefined;
      const r = await runJobGuarded(job, toChatMessages(messages), opts);
      if (r.skipped) {
        client.lastSkip = r.decision;
        // Background jobs (e.g. ingest extraction) already catch client errors and use their
        // rule-based fallback; interactive jobs get the same typed error with a clear message.
        throw new BudgetExceededError(r.decision);
      }
      client.lastModel = r.model;
      return { content: r.text };
    },
  };
  return client;
}
