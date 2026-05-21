import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/security/auth';
import { hasPermission } from '@/lib/security/roles';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin')) {
    const actor = getRequestUser(request);
    if (!hasPermission(actor.role, 'admin:read')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }
  }

  if (pathname.startsWith('/admin')) {
    const actor = getRequestUser(request);
    if (!hasPermission(actor.role, 'admin:read')) {
      const login = new URL('/', request.url);
      login.searchParams.set('admin', 'login');
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/admin/:path*'],
};
