import { postgres } from "@/lib/db/postgres";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export async function updateBehavioralTrait(params: {
  userId: string;
  traitName: string;
  observedValue: number;
  confidence?: number;
  sourceLayer?: string;
}) {
  const { userId, traitName, observedValue, confidence = 0.6, sourceLayer = "L2" } = params;
  const existing = await (postgres as any).behavioralTrait.findUnique({
    where: { userId_traitName: { userId, traitName } },
  });

  if (!existing) {
    return (postgres as any).behavioralTrait.create({
      data: {
        userId,
        traitName,
        traitValue: clamp(observedValue),
        confidence: clamp(confidence),
        evidenceCount: 1,
        sourceLayer,
      },
    });
  }

  const momentum = 0.15 * clamp(confidence);
  const nextValue = clamp(existing.traitValue + (observedValue - existing.traitValue) * momentum);
  const nextConfidence = clamp((existing.confidence * existing.evidenceCount + confidence) / (existing.evidenceCount + 1));

  return (postgres as any).behavioralTrait.update({
    where: { id: existing.id },
    data: {
      traitValue: nextValue,
      confidence: nextConfidence,
      evidenceCount: existing.evidenceCount + 1,
      sourceLayer,
    },
  });
}
