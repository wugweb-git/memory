/**
 * Rule-based extraction used when no LLM is available. Everything it emits is
 * deliberately low confidence (<0.5) and flagged `fallback: true` so downstream
 * can distinguish it from LLM output, but it is non-empty (topics + co-mention edges).
 */
export const FALLBACK_ENTITY_CONFIDENCE = 0.3;
export const FALLBACK_TOPIC_CONFIDENCE = 0.35;
export const FALLBACK_REL_CONFIDENCE = 0.3;

const STOPWORDS = new Set(
  ('the and but this that with from have has had are was were will would could should about into over under their there then than ' +
    'they them your you our not for its it is be to of in on at as by an or if we i a so do does did can may more most some any ' +
    'what when where which while also just like very much many each other such only both been being these those here how why who').split(' ')
);
const CAP_STOP = new Set(['The', 'And', 'But', 'This', 'That', 'With', 'From', 'When', 'What', 'There', 'These', 'Those', 'Then']);

export function runFallbackExtraction(content: string, limits = { entities: 5, topics: 3, relationships: 3 }) {
  const text = String(content ?? '');
  const matches = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g) || [];
  const names = Array.from(new Set(matches)).filter((m) => !CAP_STOP.has(m) && m.length > 2).slice(0, limits.entities);
  const entities = names.map((name) => ({ name, type: 'concept', confidence: FALLBACK_ENTITY_CONFIDENCE, fallback: true }));

  // Topics: most frequent non-stopword terms (>=4 chars, appearing at least twice, else top terms).
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) {
    if (STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const ranked = Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const repeated = ranked.filter(([, c]) => c >= 2);
  const pool = repeated.length ? repeated : ranked;
  const topics = pool
    .slice(0, limits.topics)
    .map(([name]) => ({ name, confidence: FALLBACK_TOPIC_CONFIDENCE, fallback: true }));

  // Relationships: co-mention between consecutive/adjacent entities (capped).
  const relationships: Array<{ from: string; to: string; type: string; weight: number; fallback: boolean }> = [];
  for (let i = 0; i < names.length && relationships.length < limits.relationships; i++) {
    for (let j = i + 1; j < names.length && relationships.length < limits.relationships; j++) {
      relationships.push({ from: names[i], to: names[j], type: 'co_mentioned', weight: FALLBACK_REL_CONFIDENCE, fallback: true });
    }
  }
  return { entities, intents: [] as any[], topics, relationships };
}
