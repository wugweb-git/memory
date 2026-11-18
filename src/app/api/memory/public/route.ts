import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { postgres as prisma } from '@/lib/db/postgres';
import { parsePublicMarkInput } from '@/lib/memory/visibility';

export const dynamic = 'force-dynamic';

/**
 * Owner-only curation of what the public /ask chat may quote.
 *
 * GET  /api/memory/public?limit=50&onlyPublic=1   list packets with their is_public flag
 * POST /api/memory/public { ids: string[], isPublic: boolean }   mark / unmark packets
 */
export async function GET(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '50', 10) || 50, 1), 200);
    const packets = await prisma.memoryPacket.findMany({
      where: {
        test_run_id: 'PROD',
        sensitivity: { not: 'restricted' },
        ...(sp.get('onlyPublic') === '1' ? { is_public: true } : {}),
      },
      orderBy: { ingestion_time: 'desc' },
      take: limit,
      select: { id: true, type: true, source: true, ingestion_time: true, is_public: true, content: true },
    });
    return NextResponse.json({
      packets: packets.map((p) => ({
        id: p.id,
        type: p.type,
        source: p.source,
        ingestion_time: p.ingestion_time,
        is_public: p.is_public,
        preview: (typeof p.content === 'string' ? p.content : JSON.stringify(p.content)).slice(0, 160),
      })),
    });
  } catch (error: unknown) {
    console.error('Memory public list error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const parsed = parsePublicMarkInput(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const result = await prisma.memoryPacket.updateMany({
      where: {
        id: { in: parsed.ids },
        // Restricted packets can never be made public.
        ...(parsed.isPublic ? { sensitivity: { not: 'restricted' } } : {}),
      },
      data: { is_public: parsed.isPublic },
    });
    return NextResponse.json({ updated: result.count, isPublic: parsed.isPublic });
  } catch (error: unknown) {
    console.error('Memory public mark error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
