import { postgres } from "@/lib/db/postgres";

export interface AdaptiveUiContext {
  userId: string;
  uiDensity: string;
  preferredMode: string | null;
  preferredOutputLength: string | null;
  preferredNavigationStyle: string | null;
}

export function contextualAction(mode: "architect" | "founder" | "operator") {
  if (mode === "operator") return "execute-now";
  if (mode === "founder") return "prioritize-revenue";
  return "design-system";
}

export async function getAdaptiveUiContext(userId: string): Promise<AdaptiveUiContext> {
  const profile = await postgres.adaptiveUxProfile.findUnique({ where: { userId } });
  if (!profile) {
    return {
      userId,
      uiDensity: "minimal",
      preferredMode: "operator",
      preferredOutputLength: "short",
      preferredNavigationStyle: "single-primary-action",
    };
  }
  return {
    userId: profile.userId,
    uiDensity: profile.uiDensity,
    preferredMode: profile.preferredMode,
    preferredOutputLength: profile.preferredOutputLength,
    preferredNavigationStyle: profile.preferredNavigationStyle,
  };
}
