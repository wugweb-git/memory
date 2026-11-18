import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/security/jwt-edge';
import { hasPermission } from '@/lib/security/roles';
import { isPublicRoute } from '@/lib/security/route-access';

/**
 * Edge middleware — admin-path RBAC.
 *
 * Must stay Edge-safe: only Web-API imports (jwt-edge uses crypto.subtle;
 * roles is pure data). Do NOT import `@/lib/security/auth` here — it pulls
 * `node:crypto` via jwt.ts and crashes the Edge runtime.
 *
 * Trust model: the session JWT only. Dev header fallbacks (x-user-role) are
 * deliberately NOT honored on this path — a spoofed header must never open
 * /admin in production.
 */

const SESSION_COOKIE = 'prism_session';

async function actorRole(request: NextRequest): Promise<string | null> {
  const token =
    request.cookies.get(SESSION_COOKIE)?.value ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    null;
  if (!token) return null;
  // Mirrors the vault's dev fallback; production always has AUTH_SECRET set
  // (the vault hard-throws at boot without it).
  const secret = process.env.AUTH_SECRET || 'dev_auth_secret_insecure_fallback';
  const payload = await verifyTokenEdge(token, secret);
  return payload?.role ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Default-deny: only the routes in route-access.ts are public. Everything
  // else is the owner's private app and needs an admin session (single-owner
  // product; a self-service signup account must not reach private data).
  if (isPublicRoute(pathname, request.method)) {
    return NextResponse.next();
  }

  const role = await actorRole(request);
  if (role && hasPermission(role, 'admin:read')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

// Run on everything except Next internals and static files (public assets).
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|apple-touch-icon.png|og-image.png|robots.txt|sitemap.xml|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff2?)$).*)',
  ],
};
