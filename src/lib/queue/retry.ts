/** Pure retry policy for the retry worker (no DB access; unit-tested). */
export const MAX_RETRY_ATTEMPTS = 5;
const BASE_MS = 60_000;
const MAX_BACKOFF_MS = 60 * 60_000;
/** A publishing item stuck in `processing` this long is presumed crashed. */
export const STALE_PROCESSING_MS = 10 * 60_000;

/** Exponential backoff: 2, 4, 8, 16 ... minutes, capped at 1h. */
export function backoffMs(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_MS * 2 ** Math.max(1, attempt));
}

export type RetryDecision =
  | { action: "retry"; attempts: number; nextRetryAt: Date }
  | { action: "dead"; attempts: number };

export function decideRetry(retryCount: number, now: Date = new Date()): RetryDecision {
  const attempts = retryCount + 1;
  if (attempts >= MAX_RETRY_ATTEMPTS) return { action: "dead", attempts };
  return { action: "retry", attempts, nextRetryAt: new Date(now.getTime() + backoffMs(attempts)) };
}

export function isStaleProcessing(updatedOrCreated: Date, now: Date = new Date()): boolean {
  return now.getTime() - updatedOrCreated.getTime() > STALE_PROCESSING_MS;
}
