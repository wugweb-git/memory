/**
 * Maps AI provider failures to a safe, user-facing shape.
 *
 * Raw provider errors can contain URLs, key fragments, request ids and model
 * names. Routes must never forward `err.message`; they call `aiErrorResponse`
 * (or `describeAiError`) and return only the fixed `userMessage`.
 */
import { NextResponse } from 'next/server';

export type AiErrorCode =
  | 'AI_QUOTA_EXHAUSTED'
  | 'AI_RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'AI_FAILED';

export interface AiErrorInfo {
  code: AiErrorCode;
  status: number;
  userMessage: string;
  retryable: boolean;
}

export const AI_QUOTA_MESSAGE = 'The daily free AI limit is reached. Try again after it resets.';

const INFO: Record<AiErrorCode, AiErrorInfo> = {
  AI_QUOTA_EXHAUSTED: { code: 'AI_QUOTA_EXHAUSTED', status: 429, userMessage: AI_QUOTA_MESSAGE, retryable: false },
  AI_RATE_LIMITED: {
    code: 'AI_RATE_LIMITED',
    status: 429,
    userMessage: 'The AI service is busy right now. Try again in a minute.',
    retryable: true,
  },
  AI_UNAVAILABLE: {
    code: 'AI_UNAVAILABLE',
    status: 503,
    userMessage: 'The AI service could not be reached. Try again in a moment.',
    retryable: true,
  },
  AI_FAILED: {
    code: 'AI_FAILED',
    status: 502,
    userMessage: 'The AI service could not complete this request. Try again later.',
    retryable: true,
  },
};

const QUOTA_RE = /free-models-per-day|per[-_ ]day|daily (free )?(limit|quota)|no credits|insufficient credits|credits? (remaining|exhausted)|out of credits|quota_exhausted|insufficient[_ ]quota|payment required/i;
const RATE_RE = /RateLimitCapacityError|rate[_ -]?limit|too many requests|\b429\b/i;
const NETWORK_RE = /fetch failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket hang up|network|timed? ?out|timeout|AbortError|UND_ERR/i;
const GENERIC_AI_RE = /LLM_FAILURE|OPENROUTER_JOB_FAILED|LLM_CALL_FAILED|AI_RetryError|RetryError|OpenRouter|openrouter\.ai|generativelanguage|api\.openai\.com|No cognitive LLM configured|OPENROUTER_API_KEY/i;

/** Collect searchable text from an error and its nested causes (bounded depth). */
function collectText(err: unknown, depth = 0, seen = new Set<unknown>()): string {
  if (err == null || depth > 4 || seen.has(err)) return '';
  if (typeof err === 'string') return err;
  if (typeof err !== 'object') return String(err);
  seen.add(err);
  const e = err as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof e.name === 'string') parts.push(e.name);
  if (typeof e.message === 'string') parts.push(e.message);
  if (typeof e.code === 'string') parts.push(e.code);
  if (typeof e.status === 'number') parts.push(String(e.status));
  if (typeof e.statusCode === 'number') parts.push(String(e.statusCode));
  if (typeof e.responseBody === 'string') parts.push(e.responseBody.slice(0, 2000));
  if (Array.isArray(e.attempts)) {
    for (const a of e.attempts as Array<{ reason?: unknown; status?: unknown }>) {
      if (a && typeof a.reason === 'string') parts.push(`reason:${a.reason}`);
      if (a && typeof a.status === 'number') parts.push(`status:${a.status}`);
    }
  }
  parts.push(collectText(e.cause, depth + 1, seen));
  parts.push(collectText(e.lastError, depth + 1, seen));
  if (Array.isArray(e.errors)) for (const x of e.errors.slice(0, 5)) parts.push(collectText(x, depth + 1, seen));
  return parts.join(' | ');
}

/**
 * Classify an error. Returns null when it does not look like an AI provider
 * failure, so callers can keep their own generic handling.
 */
export function describeAiError(err: unknown): AiErrorInfo | null {
  const text = collectText(err);
  if (!text) return null;

  if (QUOTA_RE.test(text) || /reason:quota_exhausted/.test(text)) return INFO.AI_QUOTA_EXHAUSTED;
  if (RATE_RE.test(text) || /reason:rate_limited|status:429/.test(text)) return INFO.AI_RATE_LIMITED;
  const aiContext = GENERIC_AI_RE.test(text) || /fetch failed/i.test(text);
  if (aiContext) {
    // Provider answered with an error status or the network failed: both are "try again later".
    if (NETWORK_RE.test(text) || /reason:(network|timeout)/.test(text)) return INFO.AI_UNAVAILABLE;
    return INFO.AI_FAILED;
  }
  return null;
}

/** Body shape: `error` carries the safe message so existing UIs that show `error` stay correct. */
export function aiErrorBody(info: AiErrorInfo) {
  return { error: info.userMessage, message: info.userMessage, code: info.code, retryable: info.retryable, status: 'error' as const };
}

/** NextResponse for an AI failure, or null when the error is not an AI error. */
export function aiErrorResponse(err: unknown): NextResponse | null {
  const info = describeAiError(err);
  if (!info) return null;
  return NextResponse.json(aiErrorBody(info), { status: info.status });
}
