/**
 * Layer 4 — AI Contamination Detector
 * Prevents AI-generated text from polluting the persona model.
 * Detection: stylometric, repetition, burst probability, AI phrase heuristics.
 * Rule: ONLY verified_human content strongly influences persona.
 */

import { postgres } from "@/lib/db/postgres";
import type { FingerprintResult } from "./types";

const AI_PHRASES = [
  "in today's world",
  "delve into",
  "as an ai",
  "leverage",
  "moreover",
  "it is important to note",
  "in conclusion",
  "furthermore",
  "additionally",
  "it should be noted",
  "i hope this email finds you well",
];

const GENERIC_TRANSITIONS = [
  "firstly",
  "secondly",
  "thirdly",
  "lastly",
  "in summary",
  "to summarize",
  "overall",
];

export function scoreAiContamination(text: string): FingerprintResult {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // 1. AI phrase heuristic
  const phraseHits = AI_PHRASES.reduce((acc, p) => acc + (lower.includes(p) ? 1 : 0), 0);
  const genericHits = GENERIC_TRANSITIONS.reduce((acc, p) => acc + (lower.includes(p) ? 1 : 0), 0);

  // 2. Repetition analysis
  const repeatedWords = (text.match(/(\b\w+\b)(?:\s+\1){2,}/gi) || []).length;
  const repetitionScore = Math.min(1, repeatedWords * 0.15);

  // 3. Burst probability: unusually long, dense text
  const burstScore = text.length > 1400 ? 0.15 + Math.min(0.2, (text.length - 1400) / 5000) : Math.max(0, text.length / 14000);

  // 4. Stylometric: average word length (AI tends toward longer, more uniform)
  const words = text.split(/\s+/).filter(Boolean);
  const avgWordLength = words.length ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0;
  const stylometricScore = avgWordLength > 5.8 ? Math.min(0.15, (avgWordLength - 5.8) * 0.08) : 0;

  // Composite AI probability
  const aiProbability = Math.min(
    0.98,
    0.1 + phraseHits * 0.1 + genericHits * 0.05 + repetitionScore + burstScore + stylometricScore
  );
  const humanProbability = Math.max(0.02, 1 - aiProbability);

  const styleVector = {
    length: text.length,
    punctuationDensity: text.length > 0 ? (text.match(/[,:;.!?]/g) || []).length / text.length : 0,
    avgWordLength: Number(avgWordLength.toFixed(2)),
  };

  return {
    aiProbability,
    humanProbability,
    verifiedHuman: humanProbability >= 0.72,
    styleVector,
  };
}

export interface FingerprintWithMetadata extends FingerprintResult {
  id: string;
}

export async function persistFingerprint(params: {
  userId: string;
  text: string;
  sourceType?: string;
  sourceId?: string;
}): Promise<FingerprintWithMetadata> {
  const { aiProbability, humanProbability, verifiedHuman, styleVector } = scoreAiContamination(params.text);

  const created = await postgres.outputFingerprint.create({
    data: {
      userId: params.userId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      styleVector: styleVector as unknown as any,
      aiProbability,
      humanProbability,
      verifiedHuman,
    },
  });

  return {
    id: created.id,
    aiProbability,
    humanProbability,
    verifiedHuman,
    styleVector,
  };
}

export async function isVerifiedHuman(params: { userId: string; text: string }): Promise<boolean> {
  const { verifiedHuman } = scoreAiContamination(params.text);

  // Also check recent fingerprint history for this user
  const recent = await postgres.outputFingerprint.findFirst({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
  });

  // If recent history shows high AI probability, be more conservative
  if (recent && recent.aiProbability > 0.5) {
    return false;
  }

  return verifiedHuman;
}