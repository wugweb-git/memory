import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { readJsonObject, badRequest } from '@/lib/validation/http';
import { postgres as prisma } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const body = await readJsonObject(req);
    if (!body) return badRequest('JSON object body required');
    const { packet_id } = body as { packet_id?: string };

    if (!packet_id) {
      return NextResponse.json({ error: 'packet_id is required' }, { status: 400 });
    }

    // Replay = re-run the full pipeline on this packet. The workers only pick up
    // rows with status 'active' and the *_status fields at 'pending', so reset them
    // all (and re-enable embedding + clear any stuck lock) — otherwise 'replay'
    // silently does nothing and the packet never re-processes.
    await prisma.memoryPacket.update({
      where: { id: packet_id },
      data: {
        status: 'active',
        embedding_status: 'pending',
        processing_status: 'pending',
        semantic_status: 'pending',
        is_embeddable: true,
        processing_lock: false,
        ingestion_time: new Date(),
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Replay API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
