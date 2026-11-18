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

type AnyRequest = NextRequest | Request;

function readBearer(req: AnyRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function readCookie(req: AnyRequest, name: string): string | null {
  const jar = (req as NextRequest).cookies;
  if (jar && typeof jar.get === 'function') return jar.get(name)?.value ?? null;
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

function readSessionToken(req: AnyRequest): string | null {
  return readCookie(req, SESSION_COOKIE) ?? readBearer(req);
}

/**
 * Resolve the acting user. Identity comes ONLY from the signed session
 * (JWT cookie or bearer token). x-user-id / x-user-role headers and ?userId
 * query params are never honoured. An unauthenticated request resolves to
 * the anonymous default actor (role 'user', authenticated: false).
 */
export function getRequestUser(req: AnyRequest): RequestActor {
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

  return {
    userId: IDENTITY_CONFIG.DEFAULT_USER_ID,
    email: IDENTITY_CONFIG.EMAIL,
    role: 'user',
    authenticated: false,
  };
}

/** True only for a validly signed session whose role has admin:read. */
export function isAdminRequest(req: AnyRequest): boolean {
  const actor = getRequestUser(req);
  return actor.authenticated && hasPermission(actor.role, 'admin:read');
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

/**
 * Defence in depth inside route handlers (middleware is the first gate).
 * 401 when there is no valid session, 403 when signed in without admin rights.
 */
export function requireAdmin(req: NextRequest | Request): RequestActor | NextResponse {
  const actor = getRequestUser(req);
  if (!actor.authenticated) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!hasPermission(actor.role, 'admin:read')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return actor;
}

export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 90;

/**
 * Session cookie. A number sets a persistent cookie; `null` omits Max-Age so
 * it ends when the browser closes.
 */
export function sessionCookie(token: string, maxAgeSec: number | null = SESSION_MAX_AGE_SEC): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const age = maxAgeSec === null ? '' : `; Max-Age=${maxAgeSec}`;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${age}${secure}`;
}

/** Cookie for the "keep me signed in" choice. Only an explicit false drops persistence. */
export function rememberedSessionCookie(token: string, remember: unknown): string {
  return sessionCookie(token, remember === false ? null : SESSION_MAX_AGE_SEC);
}
