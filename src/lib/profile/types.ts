export type ProfileSectionType =
  | 'published'
  | 'blog'
  | 'venture'
  | 'experience'
  | 'service'
  | 'testimonial'
  | 'reference';

export type ProfileSection = {
  id: string;
  type: ProfileSectionType | string;
  title: string;
  content: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type SocialLink = {
  platform: string;
  url: string;
};

export type ProfileRecord = {
  id?: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  socialLinks?: SocialLink[] | null;
  sections?: ProfileSection[] | null;
  theme?: Record<string, unknown> | null;
  isPublished?: boolean;
};

export type PublishToProfileInput = {
  username: string;
  userId?: string;
  outputId?: string;
  title?: string;
  body?: string;
  platform?: string;
  url?: string;
  sectionType?: 'published' | 'blog';
  tags?: string[];
};
