import { postgres } from '@/lib/db/postgres';
import { IDENTITY_CONFIG } from '@/config/identity';
import type { ProfileRecord, ProfileSection, PublishToProfileInput } from './types';

function newSectionId() {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSections(raw: unknown): ProfileSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: any, i) => ({
    id: String(s?.id ?? `legacy-${i}`),
    type: String(s?.type ?? 'published'),
    title: String(s?.title ?? 'Untitled'),
    content: (s?.content && typeof s.content === 'object' ? s.content : {}) as Record<string, unknown>,
    settings: s?.settings as Record<string, unknown> | undefined,
    createdAt: s?.createdAt ? String(s.createdAt) : undefined,
    updatedAt: s?.updatedAt ? String(s.updatedAt) : undefined,
  }));
}

export async function getProfile(username: string): Promise<ProfileRecord | null> {
  const row = await (postgres as any).profile.findUnique({ where: { username } });
  if (!row) return null;
  return {
    ...row,
    sections: normalizeSections(row.sections),
  };
}

export async function upsertProfile(
  username: string,
  data: Partial<ProfileRecord>,
): Promise<ProfileRecord> {
  const sections =
    data.sections !== undefined ? data.sections : undefined;
  const row = await (postgres as any).profile.upsert({
    where: { username },
    update: {
      ...data,
      ...(sections !== undefined ? { sections } : {}),
      updated_at: new Date(),
    },
    create: {
      username,
      displayName: data.displayName ?? username,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      socialLinks: data.socialLinks ?? [],
      sections: sections ?? [],
      theme: data.theme ?? {},
      isPublished: data.isPublished ?? false,
    },
  });
  return { ...row, sections: normalizeSections(row.sections) };
}

export async function addProfileSection(
  username: string,
  section: Omit<ProfileSection, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<ProfileRecord> {
  const profile = await getProfile(username);
  const now = new Date().toISOString();
  const next: ProfileSection = {
    id: section.id ?? newSectionId(),
    type: section.type,
    title: section.title,
    content: section.content,
    settings: section.settings,
    createdAt: now,
    updatedAt: now,
  };
  const sections = [next, ...(profile?.sections ?? [])];
  return upsertProfile(username, {
    displayName: profile?.displayName ?? IDENTITY_CONFIG.DISPLAY_NAME,
    sections,
    isPublished: profile?.isPublished ?? true,
  });
}

export async function updateProfileSection(
  username: string,
  sectionId: string,
  patch: Partial<Pick<ProfileSection, 'title' | 'content' | 'settings' | 'type'>>,
): Promise<ProfileRecord | null> {
  const profile = await getProfile(username);
  if (!profile?.sections) return null;
  const sections = profile.sections.map((s) =>
    s.id === sectionId
      ? {
          ...s,
          ...patch,
          content: patch.content ? { ...s.content, ...patch.content } : s.content,
          updatedAt: new Date().toISOString(),
        }
      : s,
  );
  return upsertProfile(username, { sections });
}

export async function removeProfileSection(
  username: string,
  sectionId: string,
): Promise<ProfileRecord | null> {
  const profile = await getProfile(username);
  if (!profile?.sections) return null;
  const sections = profile.sections.filter((s) => s.id !== sectionId);
  return upsertProfile(username, { sections });
}

/** Push generated or manual content onto the public profile (Mongo sections + optional Postgres record). */
export async function publishContentToProfile(
  input: PublishToProfileInput,
): Promise<{ profile: ProfileRecord; section: ProfileSection }> {
  const {
    username,
    userId = IDENTITY_CONFIG.DEFAULT_USER_ID,
    outputId,
    title: titleIn,
    body: bodyIn,
    platform = 'portfolio',
    url,
    sectionType,
    tags = [],
  } = input;

  let title = titleIn ?? 'New post';
  let body = bodyIn ?? '';
  let resolvedPlatform = platform;
  let externalUrl = url;

  if (outputId) {
    const output = await postgres.outputLog.findUnique({ where: { id: outputId } });
    if (output) {
      body = String(output.content ?? body);
      resolvedPlatform = String(output.platform ?? platform);
      const firstLine = body.split('\n').find((l) => l.trim())?.trim() ?? '';
      title = titleIn ?? (firstLine.slice(0, 120) || `Output · ${resolvedPlatform}`);
      await postgres.outputLog.update({
        where: { id: outputId },
        data: { status: 'published_to_profile' },
      });
      try {
        await (postgres as any).publishedOutput.create({
          data: {
            userId: output.userId ?? userId,
            outputId,
            platform: resolvedPlatform,
            externalUrl: externalUrl ?? null,
            publishedContent: {
              title,
              excerpt: body.slice(0, 280),
              content: body,
              profileUsername: username,
            },
          },
        });
      } catch {
        /* duplicate or db unavailable — profile section is source of truth */
      }
    }
  }

  const type =
    sectionType ??
    (resolvedPlatform === 'blog' || resolvedPlatform === 'medium' ? 'blog' : 'published');

  const section = await addProfileSection(username, {
    type,
    title,
    content: {
      source: resolvedPlatform,
      summary: body.slice(0, 200),
      summaryAI: body.slice(0, 400),
      body,
      url: externalUrl ?? `${IDENTITY_CONFIG.SITE_URL}/p/${username}`,
      tags,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      outputId: outputId ?? null,
    },
  });

  const added = section.sections?.[0];
  if (!added) throw new Error('Failed to add profile section');
  return { profile: section, section: added };
}

export function sectionsByType(sections: ProfileSection[], type: string) {
  return sections.filter((s) => s.type.toLowerCase() === type.toLowerCase());
}
