import { postgres } from "@/lib/db/postgres";

export interface PersonaEvidenceInput {
  userId: string;
  outputText?: string;
  sourceLayer?: "L1" | "L2" | "L2.5" | "L3" | "L4";
}

export async function extractPersonaEvidence(input: PersonaEvidenceInput) {
  const text = (input.outputText || "").trim();
  const sentenceCount = text ? text.split(/[.!?]+/).filter(Boolean).length : 0;
  const avgSentenceLength = sentenceCount ? text.length / sentenceCount : 0;
  const usesBullets = /(^|\n)\s*[-*\d]+[.)]?\s+/m.test(text);

  const tone = {
    directness: /\b(must|do|ship|now|next)\b/i.test(text) ? 0.75 : 0.55,
    passiveLikelihood: /\b(was|were|been|being)\s+\w+ed\b/i.test(text) ? 0.65 : 0.25,
  };

  const pattern = await (postgres as any).communicationPattern.create({
    data: {
      userId: input.userId,
      patternType: "structure",
      patternValue: {
        avgSentenceLength,
        usesBullets,
        sentenceCount,
      },
      confidence: 0.55,
      sampleCount: 1,
    },
  });

  return {
    tone,
    pattern,
    writingStructure: { avgSentenceLength, usesBullets },
    behavioralMarkers: {
      executionFocus: usesBullets ? 0.7 : 0.5,
      analyticalDepth: avgSentenceLength > 90 ? 0.75 : 0.55,
    },
  };
}
