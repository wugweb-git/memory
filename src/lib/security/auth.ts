import { NextRequest, NextResponse } from 'next/server';
import { INTERNAL_VAULT } from '@/config/vault';
import { IDENTITY_CONFIG } from '@/config/identity';
import { verifyToken } from '@/lib/security/jwt';
import { hasPermission } from '@/lib/security/roles';

export const SESSION_COOKIE = 'prism_session';

export type RequestActor = {
  userId: string;
  email: string | null;
  role: string;
  authenticated: boolean;
};

function readBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function readSessionToken(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE)?.value ?? readBearer(req);
}

/** Resolve the acting user from JWT cookie/header, dev headers, or fallback. */
export function getRequestUser(req: NextRequest): RequestActor {
  const token = readSessionToken(req);
  if (token) {
    const payload = verifyToken(token, INTERNAL_VAULT.AUTH_SECRET);
    if (payload) {
      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        authenticated: true,
      };
    }
  }

  const headerUserId = req.headers.get('x-user-id');
  const headerRole = req.headers.get('x-user-role');
  if (headerUserId) {
    return {
      userId: headerUserId,
      email: null,
      role: headerRole || 'user',
      authenticated: false,
    };
  }

  const queryUserId = req.nextUrl.searchParams.get('userId');
  if (queryUserId?.trim()) {
    return {
      userId: queryUserId.trim(),
      email: null,
      role: 'user',
      authenticated: false,
    };
  }

  return {
    userId: IDENTITY_CONFIG.DEFAULT_USER_ID,
    email: IDENTITY_CONFIG.EMAIL,
    role: 'user',
    authenticated: false,
  };
}

/**
 * Guard for owner-only write surfaces (ingest, cognitive runs).
 * Passes for an authenticated session (JWT cookie/bearer) or automation
 * carrying JOB_SECRET/CRON_SECRET. The anonymous role fallback does NOT
 * pass — these endpoints spend LLM budget / write to L0.
 */
export function requireOwner(req: NextRequest): RequestActor | NextResponse {
  const actor = getRequestUser(req);
  if (actor.authenticated) return actor;

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const jobSecret = req.headers.get('x-job-secret') ?? bearer;
  if (process.env.JOB_SECRET && jobSecret === process.env.JOB_SECRET) return actor;
  if (process.env.CRON_SECRET && bearer === process.env.CRON_SECRET) return actor;

  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function requirePermission(req: NextRequest, permission: string): RequestActor | NextResponse {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, permission)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return actor;
}

export function requireAdmin(req: NextRequest): RequestActor | NextResponse {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, 'admin:read')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
  }
  return actor;
}

export function sessionCookie(token: string, maxAgeSec = 60 * 60 * 24 * 7): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}
