import type { MetadataRoute } from 'next';
import { IDENTITY_CONFIG } from '@/config/identity';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/p/', '/ask'],
        disallow: [
          '/api/', '/console', '/admin', '/buffer', '/memory', '/history', '/content', '/career',
          '/cognitive', '/integrations', '/persona', '/portfolio', '/system', '/more', '/login',
          '/share-target', '/offline',
        ],
      },
    ],
    sitemap: `${IDENTITY_CONFIG.SITE_URL}/sitemap.xml`,
  };
}
