export interface ProvenanceSignalInput {
  aiProbability: number;
  humanProbability: number;
  verifiedHuman: boolean;
  sourceType?: string;
}

export interface ProvenanceSignalResult {
  trustScore: number;
  allowLearning: boolean;
  reason: string;
}

export interface AiLikelihood {
  aiProbability: number;
  humanProbability: number;
  /** Per-signal contribution (positive = more AI-like, negative = more human-like). */
  signals: Record<string, number>;
  /** Below MIN_WORDS the estimate is a weak prior, not evidence. */
  confidence: "low" | "medium";
}

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const MIN_WORDS = 40;

const AI_PHRASES = [
  "in today's world", "in today's fast-paced", "delve into", "delve", "moreover", "furthermore", "additionally",
  "it is important to note", "it's important to note", "it should be noted", "in conclusion", "as an ai",
  "tapestry", "navigate the complexities", "ever-evolving landscape", "i hope this email finds you well",
  "unlock the potential", "game-changer", "in the realm of", "testament to",
];
const CONTRACTION = /\b\w+'(?:t|s|re|ve|ll|d|m)\b/gi;
const FIRST_PERSON = /\b(?:i|i'm|i've|i'd|my|me|we|our)\b/gi;

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}

/**
 * Heuristic AI-likelihood, not a classifier: it combines weak stylometric
 * signals around a 0.30 prior. Signals (each capped, additive):
 *  - phrase:       stock LLM phrases ("delve", "moreover", ...)        up to +0.35
 *  - uniformity:   low sentence-length variance (burstiness)           up to +0.15
 *  - openers:      repeated sentence openers / transition stacking     up to +0.10
 *  - diversity:    low type-token ratio on longer text                 up to +0.08
 *  - formatting:   em-dash and bullet density                          up to +0.08
 *  - contractions: informal contractions                               down to -0.12
 *  - firstPerson:  first-person voice                                  down to -0.08
 * Texts under 40 words return the prior with confidence "low".
 */
export function detectAiLikelihood(text: string): AiLikelihood {
  const prior = 0.3;
  const raw = (text || "").trim();
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) {
    const phrase = clamp(AI_PHRASES.filter((p) => raw.toLowerCase().includes(p)).length * 0.1, 0, 0.35);
    const ai = clamp(prior + phrase, 0.02, 0.98);
    return { aiProbability: Number(ai.toFixed(3)), humanProbability: Number((1 - ai).toFixed(3)), signals: { phrase }, confidence: "low" };
  }

  const lower = raw.toLowerCase();
  const sentences = raw.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);

  const phraseHits = AI_PHRASES.filter((p) => lower.includes(p)).length;
  const phrase = clamp(phraseHits * 0.1, 0, 0.35);

  const mean = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  const cv = mean > 0 ? stddev(lengths) / mean : 0;
  const uniformity = sentences.length >= 4 ? clamp((0.5 - cv) * 0.3, 0, 0.15) : 0;

  const openers = sentences.map((s) => s.trim().split(/\s+/)[0]?.toLowerCase());
  const openerCounts = new Map<string, number>();
  openers.forEach((o) => o && openerCounts.set(o, (openerCounts.get(o) || 0) + 1));
  const repeatedOpeners = [...openerCounts.values()].filter((c) => c >= 3).length;
  const openersScore = clamp(repeatedOpeners * 0.05, 0, 0.1);

  const ttr = new Set(words.map((w) => w.toLowerCase().replace(/\W/g, ""))).size / words.length;
  const diversity = words.length >= 120 ? clamp((0.5 - ttr) * 0.4, 0, 0.08) : 0;

  const dashes = (raw.match(/[—–]/g) || []).length;
  const bullets = (raw.match(/^\s*(?:[-*•]|\d+\.)\s/gm) || []).length;
  const formatting = clamp(((dashes + bullets) / words.length) * 2, 0, 0.08);

  const contractions = -clamp(((raw.match(CONTRACTION) || []).length / words.length) * 2, 0, 0.12);
  const firstPerson = -clamp(((raw.match(FIRST_PERSON) || []).length / words.length) * 1.2, 0, 0.08);

  const signals = { phrase, uniformity, openers: openersScore, diversity, formatting, contractions, firstPerson };
  const ai = clamp(prior + Object.values(signals).reduce((a, b) => a + b, 0), 0.02, 0.98);
  const r = (n: number) => Number(n.toFixed(3));
  return {
    aiProbability: r(ai),
    humanProbability: r(1 - ai),
    signals: Object.fromEntries(Object.entries(signals).map(([k, v]) => [k, r(v)])),
    confidence: "medium",
  };
}

export function detectProvenanceSignal(input: ProvenanceSignalInput): ProvenanceSignalResult {
  const trustScore = clamp((input.humanProbability * 0.7) + (input.verifiedHuman ? 0.3 : -input.aiProbability * 0.3));
  if (!input.verifiedHuman && input.aiProbability > 0.55) {
    return { trustScore, allowLearning: false, reason: "ai_contamination_risk" };
  }
  return { trustScore, allowLearning: trustScore >= 0.55, reason: trustScore >= 0.55 ? "trusted" : "low_confidence" };
}
