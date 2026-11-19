import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { postgres } from '@/lib/db/postgres';
import { processChunk, maxPacketsPerImport, type ImportDb } from '@/lib/ingestion/ai-imports/commit';
import { LIMITS } from '@/lib/ingestion/ai-imports/packets';
import { AI_IMPORT_SOURCES } from '@/lib/ingestion/ai-imports/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET: limits the browser needs to size its chunks and show the cap. */
export async function GET(req: NextRequest) {
  const actor = requireAdmin(req);
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json({
    sources: AI_IMPORT_SOURCES,
    maxPacketsPerImport: maxPacketsPerImport(),
    maxChunkBytes: LIMITS.maxChunkBytes,
    maxConversationsPerChunk: LIMITS.maxConversationsPerChunk,
  });
}

/**
 * POST /api/import/ai-chats  (admin only, JSON)
 * { mode: 'dry-run' | 'commit', confirm?: true, importId, conversations: NormalizedConversation[] }
 *
 * The browser parses the export and sends normalised conversations in chunks well under 1 MB
 * (Vercel's body limit is about 4.5 MB). dry-run writes nothing and returns counts. commit
 * requires `confirm: true`, is idempotent per packet hash (so a chunk can be re-sent to resume),
 * writes packets private (is_public false) at priority low, and never calls the embedder.
 */
export async function POST(req: NextRequest) {
  const actor = requireAdmin(req);
  if (actor instanceof NextResponse) return actor;

  const raw = await req.text();
  if (raw.length > LIMITS.maxChunkBytes + 20_000) {
    return NextResponse.json({ error: `Chunk too large (over ${Math.round(LIMITS.maxChunkBytes / 1000)} KB). Send smaller chunks.` }, { status: 413 });
  }
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  const mode = body?.mode;
  if (mode !== 'dry-run' && mode !== 'commit') return NextResponse.json({ error: "mode must be 'dry-run' or 'commit'" }, { status: 400 });
  if (mode === 'commit' && body.confirm !== true) {
    return NextResponse.json({ error: 'Importing needs an explicit confirmation (confirm: true). Run a dry-run first to see the counts.' }, { status: 400 });
  }
  try {
    const report = await processChunk(
      { mode, importId: String(body.importId ?? ''), userId: actor.userId, conversations: body.conversations },
      postgres as unknown as ImportDb,
    );
    return NextResponse.json({ report });
  } catch (err: any) {
    const message = err?.message ?? 'Import failed';
    const client = /importId|conversations|At most|per request|packets;/.test(message);
    if (!client) console.error('[API/import/ai-chats] failed:', err);
    return NextResponse.json({ error: client ? message : 'Import failed. Nothing from this chunk is lost: re-send it to resume.' }, { status: client ? 400 : 500 });
  }
}
