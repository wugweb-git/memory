import { postgres } from "@/lib/db/postgres";

export async function getAdaptiveUiProfile(userId: string) {
  const profile = await (postgres as any).adaptiveUxProfile.findUnique({ where: { userId } });
  if (profile) return profile;

  return (postgres as any).adaptiveUxProfile.create({
    data: {
      userId,
      uiDensity: "minimal",
      preferredMode: "operator",
      preferredOutputLength: "short",
      preferredNavigationStyle: "single-primary-action",
    },
  });
}
