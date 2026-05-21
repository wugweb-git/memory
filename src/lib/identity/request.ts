import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/security/auth';

/**
 * Resolve userId for API routes from JWT session, query/body, or fallback.
 */
export function getRequestUserId(
  req: NextRequest,
  options?: { queryKey?: string; bodyUserId?: string | null },
): string {
  if (options?.bodyUserId?.trim()) return options.bodyUserId.trim();
  const key = options?.queryKey ?? 'userId';
  const fromQuery = req.nextUrl.searchParams.get(key);
  if (fromQuery?.trim()) return fromQuery.trim();
  return getRequestUser(req).userId;
}
