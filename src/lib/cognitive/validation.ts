/**
 * Request validation for /api/cognitive/* (dependency-free).
 * Identity comes from the signed session; a body `user_id` is only accepted
 * when it matches the session user.
 */
export const COGNITIVE_MODES = ['architect', 'founder', 'operator'] as const;
export type CognitiveMode = (typeof COGNITIVE_MODES)[number];

export const MAX_EXTERNAL_INPUT = 8000;
export const MAX_ITEM_LENGTH = 500;
export const MAX_COMMENT_LENGTH = 2000;
export const FEEDBACK_TYPES = ['accepted', 'rejected', 'ignored'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type Parsed<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (error: string, status = 400): { ok: false; status: number; error: string } => ({ ok: false, status, error });

export function resolveUserId(body: Record<string, unknown>, sessionUserId: string): Parsed<string> {
  const raw = body.user_id;
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: sessionUserId };
  if (typeof raw !== 'string') return fail('user_id must be a string');
  if (raw !== sessionUserId) return fail('user_id does not match the authenticated user', 403);
  return { ok: true, value: raw };
}

export function parseMode(raw: unknown): Parsed<CognitiveMode> {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: 'architect' };
  if (typeof raw === 'string' && (COGNITIVE_MODES as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as CognitiveMode };
  }
  return fail(`mode must be one of: ${COGNITIVE_MODES.join(' | ')}`);
}

export function parseExternalInput(raw: unknown): Parsed<string | null> {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== 'string') return fail('external_input must be a string');
  if (raw.length > MAX_EXTERNAL_INPUT) return fail(`external_input exceeds ${MAX_EXTERNAL_INPUT} characters`);
  return { ok: true, value: raw.trim() || null };
}

export function parseInputText(raw: unknown): Parsed<string> {
  if (typeof raw !== 'string' || raw.trim().length < 10) return fail('input_text required (minimum 10 chars)');
  if (raw.length > MAX_EXTERNAL_INPUT) return fail(`input_text exceeds ${MAX_EXTERNAL_INPUT} characters`);
  return { ok: true, value: raw.trim() };
}

export function parseItems(raw: unknown): Parsed<string[]> {
  if (!Array.isArray(raw) || raw.length === 0) return fail('items[] required — non-empty array of strings');
  if (raw.length > 10) return fail('Maximum 10 items per prioritization run');
  const items: string[] = [];
  for (const it of raw) {
    if (typeof it !== 'string' || !it.trim()) return fail('items must be non-empty strings');
    if (it.length > MAX_ITEM_LENGTH) return fail(`each item must be at most ${MAX_ITEM_LENGTH} characters`);
    items.push(it.trim());
  }
  return { ok: true, value: items };
}

export function parseFeedback(body: Record<string, unknown>): Parsed<{ decisionId: string; feedbackType: FeedbackType; comment: string | null }> {
  const { decisionId, feedbackType, comment } = body;
  if (typeof decisionId !== 'string' || !decisionId || decisionId.length > 64) return fail('decisionId required');
  if (typeof feedbackType !== 'string' || !(FEEDBACK_TYPES as readonly string[]).includes(feedbackType)) {
    return fail('feedbackType must be: accepted | rejected | ignored');
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string') return fail('comment must be a string');
  if (typeof comment === 'string' && comment.length > MAX_COMMENT_LENGTH) return fail(`comment exceeds ${MAX_COMMENT_LENGTH} characters`);
  return { ok: true, value: { decisionId, feedbackType: feedbackType as FeedbackType, comment: (comment as string | null | undefined)?.trim() || null } };
}
