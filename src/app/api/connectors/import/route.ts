import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { importExportFile } from '@/lib/connectors/exports';
import { ingestAudioFile, MAX_AUDIO_BYTES } from '@/lib/connectors/voice';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_EXPORT_BYTES = 40 * 1024 * 1024;

/**
 * POST /api/connectors/import  (multipart: connector = voice|linkedin|twitter, file)
 * Owner-only. voice => transcribe + buffer; linkedin/twitter => parse data export.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }
  const connector = String(form.get('connector') ?? '');
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!['voice', 'linkedin', 'twitter'].includes(connector)) {
    return NextResponse.json({ error: 'connector must be voice, linkedin or twitter' }, { status: 400 });
  }
  const limit = connector === 'voice' ? MAX_AUDIO_BYTES : MAX_EXPORT_BYTES;
  if (file.size > limit) return NextResponse.json({ error: 'File too large' }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const result =
    connector === 'voice'
      ? await ingestAudioFile(buf, file.name, file.type)
      : await importExportFile(connector as 'linkedin' | 'twitter', file.name, buf);

  if (result.error) {
    const status = result.error.startsWith('NOT_CONFIGURED') ? 501 : 422;
    return NextResponse.json({ error: result.error, result }, { status });
  }
  return NextResponse.json({ result });
}
