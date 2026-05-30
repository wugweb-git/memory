import { ADMIN_ONBOARDING_CHECKLIST } from '@/config/ui-content';
import { getProfile, upsertProfile } from '@/lib/profile/store';
import { IDENTITY_CONFIG } from '@/config/identity';

export type AdminChecklistItem = {
  id: number;
  text: string;
  completed: boolean;
};

const THEME_KEY = 'adminOnboardingChecklist';

function defaultChecklist(): AdminChecklistItem[] {
  return ADMIN_ONBOARDING_CHECKLIST.map((item) => ({
    id: item.id,
    text: item.text,
    completed: Boolean(item.completed),
  }));
}

export async function getAdminChecklist(
  username = IDENTITY_CONFIG.HANDLE,
): Promise<AdminChecklistItem[]> {
  const profile = await getProfile(username);
  const stored = profile?.theme?.[THEME_KEY];
  if (!Array.isArray(stored) || stored.length === 0) return defaultChecklist();

  return stored.map((row: any, i) => ({
    id: Number(row?.id ?? i + 1),
    text: String(row?.text ?? defaultChecklist()[i]?.text ?? ''),
    completed: Boolean(row?.completed),
  }));
}

export async function saveAdminChecklist(
  items: AdminChecklistItem[],
  username = IDENTITY_CONFIG.HANDLE,
): Promise<AdminChecklistItem[]> {
  const profile = await getProfile(username);
  const theme = { ...(profile?.theme ?? {}), [THEME_KEY]: items };
  await upsertProfile(username, {
    displayName: profile?.displayName ?? IDENTITY_CONFIG.DISPLAY_NAME,
    theme,
    isPublished: profile?.isPublished ?? true,
  });
  return items;
}
