import { NextResponse } from 'next/server';

export const DAILY_LIMIT_MESSAGE = 'The daily limit for this job has been reached. It resets at 00:00 UTC.';

/** True when the error came from the daily limit stopping a call (it may be wrapped, e.g. "LLM_FAILURE: BUDGET_EXCEEDED(...)"). */
export function isDailyLimitError(err: unknown): boolean {
  return /BUDGET_EXCEEDED/.test(String((err as { message?: unknown })?.message ?? err ?? ''));
}

/** 429 response with a reset message, or null when the error is something else. */
export function dailyLimitResponse(err: unknown): NextResponse | null {
  if (!isDailyLimitError(err)) return null;
  return NextResponse.json({ error: 'DAILY_LIMIT', message: DAILY_LIMIT_MESSAGE }, { status: 429 });
}
