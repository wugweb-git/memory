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
} as const;

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