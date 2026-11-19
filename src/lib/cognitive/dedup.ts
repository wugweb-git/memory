/**
 * Filters out recommendations that were recently suggested, or that repeat
 * another recommendation in the same output.
 *
 * Match rule (no model calls, so it costs nothing and cannot fail):
 *  1. exact match after lowercase + trim, as before;
 *  2. near-duplicate: the two sentences share almost all of their meaningful
 *     words (stop words dropped, plurals folded), judged by word overlap.
 * Note: returns a new object — does not mutate the input.
 */

/** Overlap at or above this counts as the same recommendation. */
export const NEAR_DUPLICATE_THRESHOLD = 0.8;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from',
  'is', 'are', 'be', 'it', 'this', 'that', 'your', 'you', 'my', 'our', 'their', 'as', 'into', 'about',
  'please', 'now', 'today', 'then', 'so', 'just',
]);

const norm = (s: string) => s.toLowerCase().trim();

/** Meaningful words of a sentence: lowercase, punctuation removed, stop words dropped, plurals folded. */
export function significantWords(text: string): Set<string> {
  const words = norm(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map((w) => {
      if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
      return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
    });
  return new Set(words);
}

/** 0..1 word overlap between two sentences (shared words over the shorter sentence's words). */
export function overlap(a: string, b: string): number {
  const wa = significantWords(a);
  const wb = significantWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size);
}

/** Same recommendation: identical text, or a near-duplicate of at least two meaningful words. */
export function isNearDuplicate(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  if (significantWords(a).size < 2 || significantWords(b).size < 2) return false;
  return overlap(a, b) >= NEAR_DUPLICATE_THRESHOLD;
}

export function dedup(output: any, history: any[]) {
  const previous: string[] = (Array.isArray(history) ? history : [])
    .flatMap((h) => (Array.isArray(h?.recommendations) ? h.recommendations : []))
    .filter((r: unknown): r is string => typeof r === 'string');

  const kept: string[] = [];
  for (const rec of Array.isArray(output?.recommendations) ? output.recommendations : []) {
    if (typeof rec !== 'string') continue;
    const repeats = previous.some((p) => isNearDuplicate(rec, p)) || kept.some((k) => isNearDuplicate(rec, k));
    if (!repeats) kept.push(rec);
  }

  return { ...output, recommendations: kept };
}
