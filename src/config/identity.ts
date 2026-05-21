/**
 * Centralized identity configuration.
 * Single source of truth for user identity resolution across all layers.
 * NEVER hardcode userId strings in components, routes, or modules.
 */

export const IDENTITY_CONFIG = {
  /** Default fallback used only when no identity can be resolved from any source */
  DEFAULT_USER_ID: 'system_user',
  
  /** LocalStorage key for persisting the resolved user identity */
  STORAGE_KEY_USER_ID: 'identity_prism_user_id',
  
  /** URL query parameter name for passing userId */
  QUERY_PARAM_USER_ID: 'userId',

  /** Display metadata used by UI surfaces */
  DISPLAY_NAME: 'System User',
  HANDLE: 'system_user',
  EMAIL: 'system@identity-prism.local',
  ROLE: 'Systems Architect',
  AVATAR_SEED: 'system-user',

  SITE_URL: 'https://wugweb.com',
  SITE_NAME: 'Identity Prism',
  X_HANDLE: '@vedanshus',
  LINKEDIN_URL: 'https://linkedin.com/in/vedanshu-srivastava',
  GITHUB_URL: 'https://github.com/wugweb-git',
  TWITTER_URL: 'https://twitter.com/wugweb',
  PORTFOLIO_URL: 'https://wugweb.com',
  YOUTUBE_URL: 'https://youtube.com',
  BEHANCE_URL: 'https://behance.net',
  DRIBBBLE_URL: 'https://dribbble.com',
  LINKEDIN_JOBS_URL: 'https://linkedin.com/jobs',
} as const;

/** Canonical external links for UI surfaces */
export function getExternalLinks() {
  const host = (() => {
    try {
      return new URL(IDENTITY_CONFIG.SITE_URL).host;
    } catch {
      return IDENTITY_CONFIG.SITE_URL.replace(/^https?:\/\//, '').split('/')[0];
    }
  })();
  return [
    { label: 'Portfolio', url: IDENTITY_CONFIG.PORTFOLIO_URL, placeholder: `${host}` },
    { label: 'GitHub', url: IDENTITY_CONFIG.GITHUB_URL, placeholder: 'github.com/username' },
    { label: 'LinkedIn', url: IDENTITY_CONFIG.LINKEDIN_URL, placeholder: 'linkedin.com/in/username' },
    { label: 'Site Extension', url: `${IDENTITY_CONFIG.SITE_URL}/extension`, placeholder: `${host}/extension` },
  ] as const;
}

export function avatarFallbackUrl(size = 512): string {
  const name = encodeURIComponent(IDENTITY_CONFIG.DISPLAY_NAME.replace(/\s+/g, '+'));
  return `https://ui-avatars.com/api/?name=${name}&size=${size}&background=F5F5F0&color=00AAFF&bold=true`;
}

export type IdentityResolver = {
  /** Resolved user identifier */
  userId: string;
  /** How the identity was resolved */
  source: 'url_param' | 'local_storage' | 'session' | 'fallback';
};

/**
 * Resolve userId from available sources.
 * Priority: URL param > localStorage > session > fallback
 */
export function resolveUserId(userIdFromRequest?: string | null): IdentityResolver {
  // 1. Explicitly provided (server-side or from parent)
  if (userIdFromRequest && userIdFromRequest !== IDENTITY_CONFIG.DEFAULT_USER_ID) {
    return { userId: userIdFromRequest, source: 'session' };
  }

  // Client-side resolution
  if (typeof window !== 'undefined') {
    // 2. URL query parameter
    const fromParam = new URLSearchParams(window.location.search).get(IDENTITY_CONFIG.QUERY_PARAM_USER_ID);
    if (fromParam) {
      localStorage.setItem(IDENTITY_CONFIG.STORAGE_KEY_USER_ID, fromParam);
      return { userId: fromParam, source: 'url_param' };
    }

    // 3. LocalStorage
    const fromStorage = localStorage.getItem(IDENTITY_CONFIG.STORAGE_KEY_USER_ID);
    if (fromStorage) {
      return { userId: fromStorage, source: 'local_storage' };
    }
  }

  // 4. Fallback
  return { userId: IDENTITY_CONFIG.DEFAULT_USER_ID, source: 'fallback' };
}