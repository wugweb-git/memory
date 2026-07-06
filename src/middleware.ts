import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/security/jwt-edge';
import { hasPermission } from '@/lib/security/roles';

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

  if (pathname.startsWith('/api/admin')) {
    const role = await actorRole(request);
    if (!role || !hasPermission(role, 'admin:read')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }
  }

  if (pathname.startsWith('/admin')) {
    const role = await actorRole(request);
    if (!role || !hasPermission(role, 'admin:read')) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/admin/:path*'],
};
