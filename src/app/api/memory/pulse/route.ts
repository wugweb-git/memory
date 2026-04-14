import { NextRequest, NextResponse } from 'next/server';
import { anchorToMemory } from '@/utils/memoryEngine';

/**
 * /api/memory/pulse
 * Legacy ingest/pulse endpoint rebuilt for the Identity Monorepo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = String(body.raw || body.candidate_text || body?.raw_payload?.message || '').trim();
    
    if (!raw) {
      return NextResponse.json({ error: 'telemetry_content is required' }, { status: 400 });
    }

    const result = await anchorToMemory({
      raw,
      sourceType: body.source_type || 'telemetry_event',
      sourceOrigin: body.platform || body.source_origin || 'external',
      metadata: body.raw_payload || {},
      profileId: body.profile_id || 'system'
    });

    return NextResponse.json({
      status: 'pulsed',
      source: 'identity_prism_monorepo',
      result
    });
  } catch (error: any) {
    console.error('Pulse Ingestion Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
