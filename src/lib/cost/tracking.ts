import { postgres } from "@/lib/db/postgres";
import type { JobName } from "@/lib/ai/models";

/**
 * Per-job OpenRouter usage tracking against the free-tier request cap.
 * Stored per UTC day in scheduler_state (key `cost:usage:YYYY-MM-DD`).
 * Every HTTP attempt counts (OpenRouter counts failed/429 requests too).
 * Read-modify-write without a lock, so concurrent runs can under-count
 * slightly; treat numbers as approximate.
 */
export const DEFAULT_FREE_DAILY_CAP = 50;

export interface JobUsage { requests: number; ok: number; failed: number; byModel: Record<string, number> }
export type DayUsage = Partial<Record<JobName, JobUsage>>;
export interface AttemptLike { model: string; ok: boolean }

export const usageKey = (d: Date = new Date()) => `cost:usage:${d.toISOString().slice(0, 10)}`;

export function freeDailyCap(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.OPENROUTER_FREE_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_FREE_DAILY_CAP;
}

/** Pure: fold attempts into a day's usage. */
export function applyAttempts(day: DayUsage, job: JobName, attempts: AttemptLike[]): DayUsage {
  const cur: JobUsage = { requests: 0, ok: 0, failed: 0, byModel: {}, ...(day[job] ?? {}) };
  cur.byModel = { ...cur.byModel };
  for (const a of attempts) {
    cur.requests += 1;
    if (a.ok) cur.ok += 1; else cur.failed += 1;
    cur.byModel[a.model] = (cur.byModel[a.model] || 0) + 1;
  }
  return { ...day, [job]: cur };
}

export function summarizeUsage(day: DayUsage, cap: number) {
  const used = Object.values(day).reduce((n, j) => n + (j?.requests ?? 0), 0);
  return { cap, used, remaining: Math.max(0, cap - used), overCap: used > cap, byJob: day };
}

export async function recordJobUsage(job: JobName, attempts: AttemptLike[]): Promise<void> {
  if (!attempts.length) return;
  const key = usageKey();
  const row = await postgres.schedulerState.findUnique({ where: { key } });
  const next = applyAttempts((row?.value as DayUsage) ?? {}, job, attempts);
  await postgres.schedulerState.upsert({ where: { key }, create: { key, value: next as any }, update: { value: next as any } });
}

export async function getUsageToday(env: NodeJS.ProcessEnv = process.env) {
  const key = usageKey();
  const row = await postgres.schedulerState.findUnique({ where: { key } });
  return { date: key.slice("cost:usage:".length), ...summarizeUsage((row?.value as DayUsage) ?? {}, freeDailyCap(env)) };
}
