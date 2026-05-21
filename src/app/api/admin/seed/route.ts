import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { seedProfileAndSources } from '@/lib/seed/profile';

export const dynamic = 'force-dynamic';

/** POST /api/admin/seed — seed profile sections + integration sources (admin only). */
export async function POST(req: NextRequest) {
  const gate = requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  try {
    const result = await seedProfileAndSources();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    console.error('[Admin Seed]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
