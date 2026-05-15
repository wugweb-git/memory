/**
 * Layer 4 — Adaptive UX Engine
 * Adapts UI based on behavioral profile.
 */

import { postgres } from "@/lib/db/postgres";

export interface AdaptiveUxProfile {
  id: string;
  userId: string;
  uiDensity: string;
  preferredMode: string | null;
  preferredOutputLength: string | null;
  preferredNavigationStyle: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAdaptiveUiProfile(userId: string): Promise<AdaptiveUxProfile> {
  const profile = await postgres.adaptiveUxProfile.findUnique({ where: { userId } });
  if (profile) return profile as unknown as AdaptiveUxProfile;

  const created = await postgres.adaptiveUxProfile.create({
    data: {
      userId,
      uiDensity: "minimal",
      preferredMode: "operator",
      preferredOutputLength: "short",
      preferredNavigationStyle: "single-primary-action",
    },
  });

  return created as unknown as AdaptiveUxProfile;
}

export async function updateAdaptiveUiProfile(
  userId: string,
  updates: Partial<Omit<AdaptiveUxProfile, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<AdaptiveUxProfile> {
  const updated = await postgres.adaptiveUxProfile.upsert({
    where: { userId },
    update: updates as any,
    create: {
      userId,
      uiDensity: updates.uiDensity ?? "minimal",
      preferredMode: updates.preferredMode ?? "operator",
      preferredOutputLength: updates.preferredOutputLength ?? "short",
      preferredNavigationStyle: updates.preferredNavigationStyle ?? "single-primary-action",
    },
  });

  return updated as unknown as AdaptiveUxProfile;
}
