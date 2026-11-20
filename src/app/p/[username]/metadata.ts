import type { Metadata } from 'next';
import { IDENTITY_CONFIG } from '@/config/identity';

export type MetaProfile = {
  username?: string | null;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
} | null | undefined;

const DEFAULT_TITLE = 'Public profile';
const MAX_DESCRIPTION = 160;

function clean(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Pure builder for the public profile's link-preview metadata. Never throws; falls back to the static default. */
export function buildProfileMetadata(username: string, profile: MetaProfile, siteUrl: string = IDENTITY_CONFIG.SITE_URL): Metadata {
  try {
    const name = clean(profile?.displayName);
    if (!profile || !name) return { title: DEFAULT_TITLE };
    const title = `${name} | Identity Prism`;
    const description = truncate(clean(profile.bio), MAX_DESCRIPTION) || `${name}'s public profile on Identity Prism.`;
    const base = siteUrl.replace(/\/+$/, '');
    const url = `${base}/p/${encodeURIComponent(username)}`;
    const avatar = clean(profile.avatarUrl);
    const images = /^https:\/\//i.test(avatar) ? [avatar] : undefined;
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: { type: 'profile', title, description, url, siteName: 'Identity Prism', ...(images ? { images } : {}) },
      twitter: { card: images ? 'summary_large_image' : 'summary', title, description, ...(images ? { images } : {}) },
    };
  } catch {
    return { title: DEFAULT_TITLE };
  }
}
