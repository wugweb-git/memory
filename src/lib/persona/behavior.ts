/**
 * Layer 4 — Behavioral Modeling Engine
 * Generates evolving behavioral traits from signals, feedback, outputs, and decisions.
 */

import { postgres } from "@/lib/db/postgres";
import type { Prisma } from "../../generated/postgres";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export interface UpdateTraitParams {
  userId: string;
  traitName: string;
  observedValue: number;
  confidence?: number;
  sourceLayer?: string;
}

export async function updateBehavioralTrait(params: UpdateTraitParams): Promise<Prisma.BehavioralTraitCreateInput> {
  const { userId, traitName, observedValue, confidence = 0.6, sourceLayer = "L2" } = params;

  const existing = await postgres.behavioralTrait.findUnique({
    where: { userId_traitName: { userId, traitName } },
  });

  if (!existing) {
    const created = await postgres.behavioralTrait.create({
      data: {
        userId,
        traitName,
        traitValue: clamp(observedValue),
        confidence: clamp(confidence),
        evidenceCount: 1,
        sourceLayer,
      },
    });
    return created as unknown as Prisma.BehavioralTraitCreateInput;
  }

  // Confidence-weighted momentum: high confidence = faster adaptation, but capped
  const momentum = 0.15 * clamp(confidence);
  const nextValue = clamp(existing.traitValue + (observedValue - existing.traitValue) * momentum);
  const nextConfidence = clamp(
    (existing.confidence * existing.evidenceCount + confidence) / (existing.evidenceCount + 1)
  );

  const updated = await postgres.behavioralTrait.update({
    where: { id: existing.id },
    data: {
      traitValue: nextValue,
      confidence: nextConfidence,
      evidenceCount: existing.evidenceCount + 1,
      sourceLayer,
    },
  });

  return updated as unknown as Prisma.BehavioralTraitCreateInput;
}

export async function getTopTraits(userId: string, limit = 6) {
  return postgres.behavioralTrait.findMany({
    where: { userId },
    orderBy: { confidence: "desc" },
    take: limit,
  });
}
