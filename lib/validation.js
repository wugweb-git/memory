import { fail } from './errors.js';

const CONTEXTS = new Set(['career', 'project', 'personal', 'philosophy']);
const INTENTS = new Set(['insight', 'decision', 'pattern', 'lesson']);
const PATTERNS = new Set(['root_cause', 'tradeoff', 'system_design', 'execution_model']);

function isUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateSpiritNotePayload(body = {}) {
  const payload = body.raw_payload || {};
  if (!payload.title || String(payload.title).trim().length < 8) throw fail('raw_payload.title must be at least 8 characters', 'validation_error', 400);
  if (!payload.body || String(payload.body).trim().length < 40) throw fail('raw_payload.body must be at least 40 characters', 'validation_error', 400);
  if (!CONTEXTS.has(payload.context)) throw fail('raw_payload.context is invalid', 'validation_error', 400);
  if (!INTENTS.has(payload.signal_intent)) throw fail('raw_payload.signal_intent is invalid', 'validation_error', 400);
  if (!PATTERNS.has(payload.logic_pattern)) throw fail('raw_payload.logic_pattern is invalid', 'validation_error', 400);
  if (Array.isArray(payload.evidence_links) && payload.evidence_links.some((u) => !isUrl(String(u)))) {
    throw fail('raw_payload.evidence_links must contain valid urls', 'validation_error', 400);
  }
}

export function validatePulsePayload(body = {}) {
  if (!body.platform) throw fail('platform is required', 'validation_error', 400);
  if (!body.raw_payload || typeof body.raw_payload !== 'object') throw fail('raw_payload is required', 'validation_error', 400);
  if (!body.external_id && !body.event_id && !body.url) throw fail('external_id or event_id or url is required', 'validation_error', 400);
}

export function normalizeScope(value = 'mine') {
  if (value === 'my') return 'mine';
  return value;
}
