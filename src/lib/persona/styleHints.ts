/**
 * Pure builder for the short STYLE HINTS block appended to the chat system prompt.
 * No I/O here so it is unit-testable. Only confident (>= 0.4) fields are used.
 */
export const STYLE_HINT_MIN_CONFIDENCE = 0.4;
export const STYLE_HINT_MAX_CHARS = 600;

export interface StyleHintInput {
  confidenceScore?: number | null;
  communicationStyle?: unknown;
  writingStyle?: unknown;
  traits?: Array<{ trait: string; score: number; confidence?: number | null }>;
}

/** Flatten a JSON style field into a few short plain-text descriptors (never a raw dump). */
function describeStyle(value: unknown): string[] {
  const out: string[] = [];
  const push = (s: unknown) => {
    if (typeof s !== 'string') return;
    const t = s.replace(/\s+/g, ' ').trim();
    if (t && t.length <= 40 && /^[\p{L}\p{N} ,'\/&-]+$/u.test(t)) out.push(t);
  };
  if (typeof value === 'string') push(value);
  else if (Array.isArray(value)) value.slice(0, 4).forEach(push);
  else if (value && typeof value === 'object') {
    for (const k of ['tone', 'style', 'voice', 'formality', 'verbosity', 'keywords', 'traits']) {
      const v = (value as Record<string, unknown>)[k];
      if (Array.isArray(v)) v.slice(0, 3).forEach(push);
      else push(v);
    }
  }
  return out.slice(0, 4);
}

export function buildStyleHints(input: StyleHintInput | null | undefined): string {
  if (!input) return '';
  const profileConfident =
    typeof input.confidenceScore === 'number' && input.confidenceScore >= STYLE_HINT_MIN_CONFIDENCE;

  const comm = profileConfident ? describeStyle(input.communicationStyle) : [];
  const writing = profileConfident ? describeStyle(input.writingStyle) : [];
  const traits = (input.traits ?? [])
    .filter(
      (t) =>
        t &&
        typeof t.trait === 'string' &&
        /^[\p{L}\p{N} _-]{1,30}$/u.test(t.trait) &&
        typeof t.confidence === 'number' &&
        t.confidence >= STYLE_HINT_MIN_CONFIDENCE,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((t) => t.trait.replace(/[_-]/g, ' '));

  const parts: string[] = [];
  if (comm.length) parts.push(`communication: ${comm.join(', ')}`);
  if (writing.length) parts.push(`writing: ${writing.join(', ')}`);
  if (traits.length) parts.push(`tendencies: ${traits.join(', ')}`);
  if (!parts.length) return '';

  const head =
    'STYLE HINTS (soft style preferences only; keep grounding answers in the context nodes; never state these as facts about the person): ';
  const block = `${head}${parts.join('; ')}.`;
  return block.length > STYLE_HINT_MAX_CHARS
    ? `${block.slice(0, STYLE_HINT_MAX_CHARS - 1).trimEnd()}…`
    : block;
}
