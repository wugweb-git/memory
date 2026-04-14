import { NextRequest, NextResponse } from 'next/server';
import { anchorToMemory } from '@/utils/memoryEngine';

/**
 * /api/memory/soul
 * Legacy ingest/soul endpoint rebuilt for the Identity Monorepo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = String(body.raw || body?.raw_payload?.body || '').trim();
    
    if (!raw) {
      return NextResponse.json({ error: 'raw_content is required' }, { status: 400 });
    }

    const result = await anchorToMemory({
      raw,
      sourceType: body.source_type || 'spirit_note',
      sourceOrigin: body.source_origin || 'manual',
      metadata: body.raw_payload || {},
      profileId: body.profile_id || 'system',
      isPublic: Boolean(body.is_public)
    });

    return NextResponse.json({
      status: 'saved',
      source: 'identity_prism_monorepo',
      result
    });
  } catch (error: any) {
    console.error('Soul Ingestion Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
