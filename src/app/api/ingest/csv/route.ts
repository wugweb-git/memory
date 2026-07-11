import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestUserId } from '@/lib/identity/request';
import { importCsv } from '@/lib/ingestion/csv-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/ingest/csv (multipart) — bulk-import a blog / case-study CSV.
 * Fields: file (the CSV), type ('blog' | 'case_study', default 'blog').
 * Owner-guarded + rate-limited. Returns a per-row import summary.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  const limit = await checkRateLimit(`ingest:csv:${actor.userId}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    const type = String(form.get('type') || 'blog');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No CSV file provided (form field "file").' }, { status: 400 });
    }

    const text = new TextDecoder().decode(await file.arrayBuffer());
    const summary = await importCsv(text, getRequestUserId(req), { type });
    return NextResponse.json(summary);
  } catch (err: any) {
    console.error('[API/Ingest/CSV]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
