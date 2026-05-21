import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!actor.authenticated) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    id: actor.userId,
    email: actor.email,
    role: actor.role,
  });
}
