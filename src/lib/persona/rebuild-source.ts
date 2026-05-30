import { getProfile } from '@/lib/profile/store';
import { IDENTITY_CONFIG } from '@/config/identity';

/** Aggregate human-authored text from the public profile for persona rebuild. */
export async function collectProfileRebuildText(username?: string): Promise<string> {
  const handle = username ?? IDENTITY_CONFIG.HANDLE;
  const profile = await getProfile(handle);
  if (!profile) return '';

  const parts: string[] = [];
  if (profile.bio?.trim()) parts.push(profile.bio.trim());

  for (const section of profile.sections ?? []) {
    const c = section.content ?? {};
    const body = String((c as Record<string, unknown>).body ?? (c as Record<string, unknown>).summary ?? '');
    const title = section.title?.trim();
    if (title) parts.push(title);
    if (body.trim()) parts.push(body.trim());
  }

  return parts.join('\n\n').slice(0, 12_000);
}
