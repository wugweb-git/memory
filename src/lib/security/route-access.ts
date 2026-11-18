/**
 * Route access policy (default-deny). Edge-safe: pure data and string checks only.
 *
 * Everything requires the owner session EXCEPT the routes listed here:
 * the public surfaces (profile, showcase, the visitor-facing /ask chat) and
 * routes that authenticate themselves with their own secret or signature.
 */

const PUBLIC_PAGE_PREFIXES = ['/p/', '/offline'];
const PUBLIC_PAGE_EXACT = new Set(['/', '/login', '/ask', '/p']);

/** Routes that check their own secret or signature, or are the visitor chat. */
const PUBLIC_API_PREFIXES = [
  '/api/auth/',
  '/api/jobs/', // CRON_SECRET / JOB_SECRET / admin session checked in the route
  '/api/webhooks/', // webhook secret or HMAC checked in the route
  '/api/oauth/google/callback',
];
const PUBLIC_API_EXACT = new Set(['/api/chat']);

/** Public read-only data for the profile page and showcase (GET and HEAD only). */
const PUBLIC_API_READONLY_PREFIXES = ['/api/profile/', '/api/showcase'];

export function isPublicRoute(pathname: string, method: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const m = method.toUpperCase();

  if (path.startsWith('/api/')) {
    if (PUBLIC_API_EXACT.has(path)) return true;
    if (PUBLIC_API_PREFIXES.some((p) => path.startsWith(p))) return true;
    if ((m === 'GET' || m === 'HEAD') && PUBLIC_API_READONLY_PREFIXES.some((p) => path.startsWith(p))) {
      return true;
    }
    return false;
  }

  if (PUBLIC_PAGE_EXACT.has(path)) return true;
  return PUBLIC_PAGE_PREFIXES.some((p) => path.startsWith(p));
}
