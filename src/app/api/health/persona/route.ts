import { NextResponse } from 'next/server';
import { postgres } from '@/lib/db/postgres';
import { DB_SETUP_HINT, isPrismaConfigError } from '@/lib/db/degraded';

export const dynamic = 'force-dynamic';

/** Public persona health summary (read-only, no admin required). */
export async function GET() {
  try {
    const activeProfiles = await postgres.personaProfile.count();
    const totalTraits = await postgres.behavioralTrait.count();
    const avgConfidence = await postgres.behavioralTrait.aggregate({ _avg: { confidence: true } });
    return NextResponse.json({
      status: 'ok',
      averageTraitConfidence: avgConfidence._avg.confidence ?? 0,
      counts: { activeProfiles, behavioralTraits: totalTraits },
    });
  } catch (error: unknown) {
    if (isPrismaConfigError(error)) {
      return NextResponse.json({
        status: 'degraded',
        warning: DB_SETUP_HINT,
        averageTraitConfidence: 0,
        counts: { activeProfiles: 0, behavioralTraits: 0 },
      });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
