import { postgres } from "@/lib/db/postgres";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export async function evolvePersonaField(params: {
  userId: string;
  field: "communicationStyle" | "writingStyle" | "decisionStyle";
  nextValue: Record<string, unknown>;
  reason: string;
  confidenceWeight?: number;
}) {
  const { userId, field, nextValue, reason, confidenceWeight = 0.6 } = params;
  const profile = await (postgres as any).personaProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, confidenceScore: 0.5 },
  });

  const oldValue = (profile as any)[field] ?? {};
  const merged = { ...(oldValue as object), ...nextValue };
  const delta = clamp(confidenceWeight * 0.1, 0.01, 0.1);
  const nextConfidence = clamp((profile.confidenceScore ?? 0.5) + delta - 0.03);

  await (postgres as any).personaProfile.update({
    where: { userId },
    data: {
      [field]: merged,
      confidenceScore: nextConfidence,
    },
  });

  await (postgres as any).personaEvolutionLog.create({
    data: {
      userId,
      changedField: field,
      oldValue: oldValue as any,
      newValue: merged as any,
      reason,
      confidenceDelta: nextConfidence - (profile.confidenceScore ?? 0.5),
    },
  });

  return { field, nextConfidence, merged };
}
