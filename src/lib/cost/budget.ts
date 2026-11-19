import { freeDailyCap, summarizeUsage, type DayUsage } from "./tracking";

/** Whether another free-tier request fits under today's cap. */
export function withinFreeCap(day: DayUsage, env: NodeJS.ProcessEnv = process.env) {
  const s = summarizeUsage(day, freeDailyCap(env));
  return { allowed: s.remaining > 0, remaining: s.remaining, cap: s.cap };
}
