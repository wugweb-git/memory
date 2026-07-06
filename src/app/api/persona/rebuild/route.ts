import { NextRequest, NextResponse } from 'next/server';
import { rebuildPersona } from '@/lib/persona/rebuild';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/persona/rebuild — full L4 rebuild per the layer-4 doc:
 * evidence (profile + outputs + decisions + signals + feedback) → traits →
 * LLM voice synthesis → confidence-gated evolution of all persona fields.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`persona:rebuild:${actor.userId}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      outputText?: string;
      username?: string;
    };

    const result = await rebuildPersona({
      userId: body.userId,
      username: body.username,
      outputText: body.outputText,
    });

    if (result.status === 'blocked') {
      const code = result.reason === 'ai_contamination_detected' ? 422 : 400;
      return NextResponse.json(result, { status: code });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[L4] rebuild POST error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
