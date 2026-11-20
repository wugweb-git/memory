import type { MetadataRoute } from 'next';
import { IDENTITY_CONFIG } from '@/config/identity';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${IDENTITY_CONFIG.SITE_URL}/p/${IDENTITY_CONFIG.HANDLE}`, changeFrequency: 'weekly' }];
}
