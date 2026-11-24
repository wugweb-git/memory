/**
 * Client-side reading of the safe error body that AI routes return
 * (see `aiErrorBody` in ./error-messages). The server already maps provider
 * failures to a fixed, user-safe sentence, so the UI shows it as returned and
 * only decides how to present it:
 *
 * - a quota or daily budget limit is a calm notice with no Retry (retrying
 *   cannot help until the limit resets);
 * - anything else is retryable unless the server says `retryable: false`.
 */
export interface ClientAiError {
  /** Sentence to show, exactly as the server returned it (or the supplied fallback). */
  message: string;
  code?: string;
  retryable: boolean;
  /** True for a limit that only time fixes: show as a notice, not an alarm. */
  limit: boolean;
}

const NON_RETRYABLE_CODES = new Set(['AI_QUOTA_EXHAUSTED', 'BUDGET_EXCEEDED', 'DAILY_LIMIT']);
const CODE_LIKE = /^[A-Z][A-Z0-9_]+$/;

export function readAiErrorBody(body: unknown, fallback: string): ClientAiError {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const errorField = str(b.error);
  const code = str(b.code) || (CODE_LIKE.test(errorField) ? errorField : '') || undefined;
  const message = str(b.message) || (CODE_LIKE.test(errorField) ? '' : errorField) || fallback;
  const limit = code !== undefined && NON_RETRYABLE_CODES.has(code);
  const retryable = !limit && b.retryable !== false;
  return { message, code, retryable, limit };
}

/** Parse an error body from a fetch Response without throwing. */
export async function readAiErrorResponse(res: Response, fallback: string): Promise<ClientAiError> {
  const body = await res.json().catch(() => null);
  return readAiErrorBody(body, fallback);
}
