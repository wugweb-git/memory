import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestUserId } from '@/lib/identity/request';
import { importCaseStudyDocx } from '@/lib/ingestion/docx-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/ingest/docx (multipart) — import a case-study .docx, one memory
 * packet per "Case Study N:" block. Owner-guarded + rate-limited.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const limit = await checkRateLimit(`ingest:docx:${actor.userId}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No .docx file provided (form field "file").' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await importCaseStudyDocx(buffer, getRequestUserId(req), file.name);
    return NextResponse.json(summary);
  } catch (err: any) {
    console.error('[API/Ingest/DOCX]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
