import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/security/auth';

/**
 * Resolve userId for API routes from the signed session only (JWT cookie or
 * bearer). Query params and body fields are never trusted for identity.
 */
export function getRequestUserId(req: NextRequest): string {
  return getRequestUser(req).userId;
}
