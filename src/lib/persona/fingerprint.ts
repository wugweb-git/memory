import { postgres } from "@/lib/db/postgres";

const AI_PHRASES = ["in today's world", "delve into", "as an ai", "leverage", "moreover"];

export function scoreAiContamination(text: string) {
  const lower = text.toLowerCase();
  const phraseHits = AI_PHRASES.reduce((acc, p) => acc + (lower.includes(p) ? 1 : 0), 0);
  const repetition = /(\b\w+\b)(?:\s+\1){2,}/i.test(text) ? 0.2 : 0;
  const burst = text.length > 1400 ? 0.15 : 0.05;
  const aiProbability = Math.min(0.98, 0.2 + phraseHits * 0.12 + repetition + burst);
  const humanProbability = Math.max(0.02, 1 - aiProbability);
  return { aiProbability, humanProbability, verifiedHuman: humanProbability >= 0.72 };
}

export async function persistFingerprint(params: {
  userId: string;
  text: string;
  sourceType?: string;
  sourceId?: string;
}) {
  const { aiProbability, humanProbability, verifiedHuman } = scoreAiContamination(params.text);
  return postgres.outputFingerprint.create({
    data: {
      userId: params.userId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      styleVector: {
        length: params.text.length,
        punctuationDensity: (params.text.match(/[,:;.!?]/g) || []).length / Math.max(1, params.text.length),
      },
      aiProbability,
      humanProbability,
      verifiedHuman,
    },
  });
}
