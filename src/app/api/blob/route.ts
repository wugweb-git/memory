import { NextRequest, NextResponse } from 'next/server';
import { Push_To_Blob, getBlobStats, cleanupExpiredBlobItems } from '@/lib/blobLayer';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/blob
 * Lists blob items with filtering.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || undefined;
  const source = searchParams.get('source') || undefined;
  const state = searchParams.get('state') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
  const offset = Number(searchParams.get('offset') || 0);

  try {
    const items = await prisma.blobItem.findMany({
      where: {
        type: type ? { contains: type, mode: 'insensitive' } : undefined,
        source: source ? { contains: source, mode: 'insensitive' } : undefined,
        state: state ? (state as any) : undefined,
      },
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' },
      include: { events: { take: 5, orderBy: { created_at: 'desc' } } }
    });

    const total = await prisma.blobItem.count({
      where: {
        type: type ? { contains: type, mode: 'insensitive' } : undefined,
        source: source ? { contains: source, mode: 'insensitive' } : undefined,
        state: state ? (state as any) : undefined,
      }
    });

    return NextResponse.json({ items, total, limit, offset });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/blob
 * Handles new ingestion into Layer 0.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check storage limits first
    const stats = await getBlobStats();
    if (stats.status === 'blocked') {
      return NextResponse.json({ 
        error: 'STORAGE_BLOCKED', 
        message: 'Blob storage is at 95% capacity. Ingestion blocked.' 
      }, { status: 403 });
    }

    const item = await Push_To_Blob({
      type: body.type,
      source: body.source,
      source_id: body.source_id,
      raw_payload: body.raw_payload,
      file_ref: body.file_ref,
      trace_json: body.trace_json
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

/**
 * DELETE /api/blob
 * Trigger cleanup of expired items.
 */
export async function DELETE() {
  try {
    const removed = await cleanupExpiredBlobItems();
    return NextResponse.json({ success: true, expired_removed: removed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
