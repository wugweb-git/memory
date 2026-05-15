/**
 * Layer 4 — Persona Evolution Engine
 * Updates persona gradually over time.
 * Rules: slow evolution, confidence weighted, reversible, fully logged.
 * NEVER overwrites aggressively or mutates from a single output.
 */

import { postgres } from "@/lib/db/postgres";
import type { EvolutionResult } from "./types";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export interface EvolveFieldParams {
  userId: string;
  field: "communicationStyle" | "writingStyle" | "decisionStyle";
  nextValue: Record<string, unknown>;
  reason: string;
  confidenceWeight?: number;
}

export async function evolvePersonaField(params: EvolveFieldParams): Promise<EvolutionResult> {
  const { userId, field, nextValue, reason, confidenceWeight = 0.6 } = params;

  // Gate: do not mutate from weak evidence
  if (confidenceWeight < 0.4) {
    return { field, nextConfidence: 0, merged: {}, delta: 0 };
  }

  const profile = await postgres.personaProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, confidenceScore: 0.5 },
  });

  const oldValue = (profile as Record<string, unknown>)[field] as Record<string, unknown> | null | undefined;
  const safeOld = oldValue ?? {};

  // Slow merge: only override keys present in nextValue; preserve existing keys
  const merged = { ...safeOld, ...nextValue };

  // Confidence delta: small, bounded increment
  const delta = clamp(confidenceWeight * 0.1, 0.01, 0.08);
  const nextConfidence = clamp((profile.confidenceScore ?? 0.5) + delta - 0.02);

  await postgres.personaProfile.update({
    where: { userId },
    data: {
      [field]: merged as unknown as any,
      confidenceScore: nextConfidence,
    },
  });

  await postgres.personaEvolutionLog.create({
    data: {
      userId,
      changedField: field,
      oldValue: safeOld as unknown as any,
      newValue: merged as unknown as any,
      reason,
      confidenceDelta: nextConfidence - (profile.confidenceScore ?? 0.5),
    },
  });

  return { field, nextConfidence, merged, delta };
}

export async function rollbackPersonaField(params: {
  userId: string;
  field: "communicationStyle" | "writingStyle" | "decisionStyle";
  toLogId?: string;
}): Promise<boolean> {
  const { userId, field, toLogId } = params;

  const log = toLogId
    ? await postgres.personaEvolutionLog.findUnique({ where: { id: toLogId } })
    : await postgres.personaEvolutionLog.findFirst({
        where: { userId, changedField: field },
        orderBy: { createdAt: "desc" },
      });

  if (!log || !log.oldValue) return false;

  await postgres.personaProfile.update({
    where: { userId },
    data: {
      [field]: log.oldValue as unknown as any,
    },
  });

  // Log the rollback itself
  await postgres.personaEvolutionLog.create({
    data: {
      userId,
      changedField: field,
      oldValue: log.newValue as unknown as any,
      newValue: log.oldValue as unknown as any,
      reason: "rollback",
      confidenceDelta: -(log.confidenceDelta ?? 0),
    },
  });

  return true;
}

export async function getEvolutionTimeline(userId: string, limit = 20) {
  return postgres.personaEvolutionLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
