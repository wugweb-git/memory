import { NextRequest, NextResponse } from 'next/server';
import { extractPersonaEvidence } from '@/lib/persona/extractor';
import { evolvePersonaField } from '@/lib/persona/evolution';
import { isVerifiedHuman } from '@/lib/persona/fingerprint';
import { collectProfileRebuildText } from '@/lib/persona/rebuild-source';
import { IDENTITY_CONFIG } from '@/config/identity';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      outputText?: string;
      useProfileSource?: boolean;
      username?: string;
    };
    const userId = body.userId || IDENTITY_CONFIG.DEFAULT_USER_ID;
    let text = body.outputText?.trim() ?? '';

    if (!text && body.useProfileSource !== false) {
      text = await collectProfileRebuildText(body.username ?? IDENTITY_CONFIG.HANDLE);
    }

    if (!text || text.length < 40) {
      return NextResponse.json(
        { status: 'blocked', reason: 'insufficient_source_text' },
        { status: 400 },
      );
    }

    const verified = await isVerifiedHuman({ userId, text });
    if (!verified) {
      return NextResponse.json(
        { status: 'blocked', reason: 'ai_contamination_detected' },
        { status: 422 },
      );
    }

    const extracted = await extractPersonaEvidence({
      userId,
      outputText: text,
      sourceLayer: 'L4',
    });
    const evolution = await evolvePersonaField({
      userId,
      field: 'writingStyle',
      nextValue: extracted.writingStructure as unknown as Record<string, unknown>,
      reason: 'persona_rebuild',
      confidenceWeight: 0.6,
    });

    return NextResponse.json({
      status: 'ok',
      sourceLength: text.length,
      extracted,
      evolution,
    });
  } catch (err) {
    console.error('[L4] rebuild POST error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
