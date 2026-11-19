import type { JobName } from '@/lib/ai/models';
import { freeDailyCap, usageKey, type DayUsage, type UsageStore } from './tracking';

/**
 * Daily request budget guard for the shared free OpenRouter cap.
 *
 * Usage is the same per-UTC-day record the tracker writes (scheduler_state key
 * `cost:usage:YYYY-MM-DD`), so the day rolls over by key and the guard reads
 * exactly what has been counted. Every HTTP attempt counts as one request.
 *
 * Priority rule: interactive jobs (ask, decision) are only limited by their own
 * daily budget. Background jobs (signals, summary, ingest) are limited by their
 * own budget AND may never eat into the headroom still reserved for interactive
 * jobs: a background request is allowed only while
 *   total used + remaining interactive entitlement + 1 <= overall free cap.
 */
export const INTERACTIVE_JOBS: readonly JobName[] = ['ask', 'decision'];
export const BACKGROUND_JOBS: readonly JobName[] = ['signals', 'summary', 'ingest'];
export const ALL_JOBS: readonly JobName[] = [...INTERACTIVE_JOBS, ...BACKGROUND_JOBS];

/** Defaults sum to the 50/day free cap: 37 interactive + 13 background. */
export const DEFAULT_DAILY_BUDGETS: Record<JobName, number> = {
  ask: 25,
  decision: 12,
  signals: 3,
  summary: 3,
  ingest: 7,
};

export const isInteractive = (job: JobName) => INTERACTIVE_JOBS.includes(job);

export function budgetEnvName(job: JobName): string {
  return `DAILY_BUDGET_${job.toUpperCase()}`;
}

/** Per-job daily request limits from env (DAILY_BUDGET_ASK etc.); invalid values fall back to defaults. 0 disables a job. */
export function jobLimits(env: NodeJS.ProcessEnv = process.env): Record<JobName, number> {
  const out = { ...DEFAULT_DAILY_BUDGETS };
  for (const job of ALL_JOBS) {
    const raw = env[budgetEnvName(job)];
    if (raw === undefined || raw.trim() === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) out[job] = Math.floor(n);
  }
  return out;
}

export type BudgetReason = 'job_limit' | 'reserved_for_interactive' | 'store_unavailable';

export interface BudgetDecision {
  allowed: boolean;
  job: JobName;
  used: number;
  limit: number;
  remaining: number;
  reason?: BudgetReason;
  message?: string;
}

const usedBy = (day: DayUsage, job: JobName) => day[job]?.requests ?? 0;

/** Pure: may `job` make one more request given today's usage? */
export function evaluateBudget(day: DayUsage, job: JobName, env: NodeJS.ProcessEnv = process.env): BudgetDecision {
  const limits = jobLimits(env);
  const used = usedBy(day, job);
  const limit = limits[job];
  const remaining = Math.max(0, limit - used);
  const base = { job, used, limit, remaining };
  if (used >= limit) {
    return {
      ...base,
      allowed: false,
      reason: 'job_limit',
      message: `Daily ${job} request budget used up (${used}/${limit}). It resets at 00:00 UTC.`,
    };
  }
  if (!isInteractive(job)) {
    const total = ALL_JOBS.reduce((n, j) => n + usedBy(day, j), 0);
    const reserved = INTERACTIVE_JOBS.reduce((n, j) => n + Math.max(0, limits[j] - usedBy(day, j)), 0);
    if (total + reserved + 1 > freeDailyCap(env)) {
      return {
        ...base,
        allowed: false,
        reason: 'reserved_for_interactive',
        message: `Skipped ${job}: the remaining free requests today are reserved for ask and decision.`,
      };
    }
  }
  return { ...base, allowed: true };
}

export async function checkBudget(
  job: JobName,
  opts: { env?: NodeJS.ProcessEnv; store?: UsageStore; now?: Date } = {},
): Promise<BudgetDecision> {
  const env = opts.env ?? process.env;
  try {
    const store = opts.store ?? (await import('./tracking')).neonUsageStore;
    const day = await store.load(usageKey(opts.now));
    return evaluateBudget(day, job, env);
  } catch (err) {
    // Interactive jobs fail open (never block the owner on a bookkeeping outage);
    // background jobs fail closed (skip, use the rule-based fallback).
    const limit = jobLimits(env)[job];
    if (isInteractive(job)) return { allowed: true, job, used: 0, limit, remaining: limit };
    console.error('[cost/guard] usage store unavailable, skipping background job:', err instanceof Error ? err.message : err);
    return { allowed: false, job, used: 0, limit, remaining: 0, reason: 'store_unavailable', message: `Skipped ${job}: usage store unavailable.` };
  }
}

/** Thrown when a job is blocked and has no fallback (interactive jobs, or JobClient callers that catch it). */
export class BudgetExceededError extends Error {
  decision: BudgetDecision;
  constructor(decision: BudgetDecision) {
    super(`BUDGET_EXCEEDED(${decision.job}): ${decision.message ?? 'daily budget exhausted'}`);
    this.name = 'BudgetExceededError';
    this.decision = decision;
  }
}

/** Today's usage vs limit per job, for the cost route and card. */
export function summarizeBudgets(day: DayUsage, env: NodeJS.ProcessEnv = process.env) {
  const limits = jobLimits(env);
  return ALL_JOBS.map((job) => {
    const used = usedBy(day, job);
    const d = evaluateBudget(day, job, env);
    return {
      job,
      kind: isInteractive(job) ? ('interactive' as const) : ('background' as const),
      used,
      limit: limits[job],
      remaining: d.remaining,
      allowed: d.allowed,
      blockedReason: d.reason ?? null,
    };
  });
}
