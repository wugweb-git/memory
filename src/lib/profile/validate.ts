/**
 * Profile write whitelist + public visibility. Pure (no DB / Next imports) so
 * it is unit-testable. Unknown fields are STRIPPED; wrong types or oversize
 * values are REJECTED with a message.
 */
import type { ProfileSection, SocialLink } from './types';

export const PROFILE_WRITABLE_FIELDS = [
  'displayName',
  'bio',
  'avatarUrl',
  'coverImageUrl',
  'socialLinks',
  'sections',
  'theme',
  'isPublished',
] as const;

export const SECTION_WRITABLE_FIELDS = ['type', 'title', 'content', 'settings'] as const;

export const LIMITS = {
  username: 64,
  displayName: 120,
  bio: 2000,
  url: 2048,
  socialLinks: 20,
  platform: 40,
  sections: 200,
  sectionType: 40,
  sectionTitle: 200,
  sectionId: 120,
  contentBytes: 100_000,
  settingsBytes: 4_000,
  themeBytes: 4_000,
} as const;

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function jsonSize(v: unknown): number {
  try {
    return JSON.stringify(v)?.length ?? 0;
  } catch {
    return Infinity;
  }
}

export function isValidUsername(u: unknown): u is string {
  return typeof u === 'string' && u.length > 0 && u.length <= LIMITS.username && /^[A-Za-z0-9_.-]+$/.test(u);
}

function validUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > LIMITS.url) return false;
  if (v.startsWith('/') && !v.startsWith('//')) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Validate a section body. `partial` allows omitting required fields (PATCH). */
export function validateSectionInput(
  raw: unknown,
  opts: { partial?: boolean } = {},
): Validated<Partial<Pick<ProfileSection, 'type' | 'title' | 'content' | 'settings'>>> {
  if (!isPlainObject(raw)) return fail('section must be an object');
  const out: Partial<Pick<ProfileSection, 'type' | 'title' | 'content' | 'settings'>> = {};

  if (raw.type !== undefined) {
    if (typeof raw.type !== 'string' || !/^[A-Za-z0-9_-]+$/.test(raw.type) || raw.type.length > LIMITS.sectionType) {
      return fail('type must be a short alphanumeric string');
    }
    out.type = raw.type;
  } else if (!opts.partial) return fail('title and type required');

  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > LIMITS.sectionTitle) {
      return fail(`title must be 1-${LIMITS.sectionTitle} characters`);
    }
    out.title = raw.title.trim();
  } else if (!opts.partial) return fail('title and type required');

  if (raw.content !== undefined) {
    if (!isPlainObject(raw.content)) return fail('content must be an object');
    if (jsonSize(raw.content) > LIMITS.contentBytes) return fail('content too large');
    out.content = raw.content;
  }
  if (raw.settings !== undefined) {
    if (!isPlainObject(raw.settings)) return fail('settings must be an object');
    if (jsonSize(raw.settings) > LIMITS.settingsBytes) return fail('settings too large');
    out.settings = raw.settings;
  }
  return { ok: true, value: out };
}

function validateSocialLinks(raw: unknown): Validated<SocialLink[]> {
  if (!Array.isArray(raw) || raw.length > LIMITS.socialLinks) return fail('socialLinks must be a short array');
  const out: SocialLink[] = [];
  for (const l of raw) {
    if (!isPlainObject(l) || typeof l.platform !== 'string' || !l.platform.trim() || l.platform.length > LIMITS.platform) {
      return fail('socialLinks[].platform invalid');
    }
    if (!validUrl(l.url)) return fail('socialLinks[].url invalid');
    out.push({ platform: l.platform.trim(), url: l.url });
  }
  return { ok: true, value: out };
}

/** Whitelist + validate a profile write body. Unknown fields are dropped. */
export function validateProfileInput(raw: unknown): Validated<Record<string, unknown>> {
  if (!isPlainObject(raw)) return fail('body must be a JSON object');
  const out: Record<string, unknown> = {};

  if (raw.displayName !== undefined) {
    if (typeof raw.displayName !== 'string' || !raw.displayName.trim() || raw.displayName.length > LIMITS.displayName) {
      return fail(`displayName must be 1-${LIMITS.displayName} characters`);
    }
    out.displayName = raw.displayName.trim();
  }
  if (raw.bio !== undefined) {
    if (raw.bio !== null && (typeof raw.bio !== 'string' || raw.bio.length > LIMITS.bio)) {
      return fail(`bio must be a string up to ${LIMITS.bio} characters`);
    }
    out.bio = raw.bio;
  }
  for (const k of ['avatarUrl', 'coverImageUrl'] as const) {
    const v = raw[k];
    if (v === undefined) continue;
    if (v !== null && v !== '' && !validUrl(v)) return fail(`${k} must be an http(s) or relative URL`);
    out[k] = v === '' ? null : v;
  }
  if (raw.isPublished !== undefined) {
    if (typeof raw.isPublished !== 'boolean') return fail('isPublished must be a boolean');
    out.isPublished = raw.isPublished;
  }
  if (raw.theme !== undefined) {
    if (!isPlainObject(raw.theme) || jsonSize(raw.theme) > LIMITS.themeBytes) return fail('theme must be a small object');
    out.theme = raw.theme;
  }
  if (raw.socialLinks !== undefined) {
    const r = validateSocialLinks(raw.socialLinks);
    if (!r.ok) return r;
    out.socialLinks = r.value;
  }
  if (raw.sections !== undefined) {
    if (!Array.isArray(raw.sections) || raw.sections.length > LIMITS.sections) return fail('sections must be an array');
    const sections: Record<string, unknown>[] = [];
    for (const s of raw.sections) {
      const r = validateSectionInput(s);
      if (!r.ok) return r;
      const id = isPlainObject(s) && typeof s.id === 'string' && s.id.length <= LIMITS.sectionId ? s.id : undefined;
      const extra: Record<string, unknown> = {};
      if (isPlainObject(s)) {
        for (const k of ['createdAt', 'updatedAt'] as const) if (typeof s[k] === 'string') extra[k] = s[k];
      }
      sections.push({ ...(id ? { id } : {}), ...r.value, ...extra });
    }
    out.sections = sections;
  }
  return { ok: true, value: out };
}

/** Defence in depth for the store: keep only writable profile keys. */
export function pickProfileFields<T extends Record<string, unknown>>(data: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const k of PROFILE_WRITABLE_FIELDS) if (k in data && data[k] !== undefined) out[k] = data[k];
  return out as Partial<T>;
}

/* ── Public visibility ─────────────────────────────────────────── */

/** A section is hidden from the public when it is marked draft/unpublished. */
export function isSectionPublic(section: Pick<ProfileSection, 'settings' | 'content'>): boolean {
  for (const bag of [section.settings, section.content]) {
    if (!bag || typeof bag !== 'object') continue;
    const b = bag as Record<string, unknown>;
    if (b.published === false || b.isPublished === false || b.draft === true || b.hidden === true) return false;
    const status = typeof b.status === 'string' ? b.status.toLowerCase() : '';
    if (status === 'draft' || status === 'unpublished' || status === 'hidden') return false;
  }
  return true;
}

type PublicProfileInput = {
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  socialLinks?: unknown;
  sections?: ProfileSection[] | null;
  theme?: unknown;
  isPublished?: boolean;
};

/**
 * Shape a profile for a non-admin reader. Returns null when the profile is
 * unpublished (callers answer 404). Strips internals and draft sections.
 */
export function toPublicProfile(p: PublicProfileInput) {
  if (!p.isPublished) return null;
  return {
    username: p.username,
    displayName: p.displayName,
    bio: p.bio ?? null,
    avatarUrl: p.avatarUrl ?? null,
    coverImageUrl: p.coverImageUrl ?? null,
    socialLinks: p.socialLinks ?? [],
    theme: p.theme ?? {},
    isPublished: true,
    sections: (p.sections ?? []).filter(isSectionPublic),
  };
}
