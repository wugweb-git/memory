import { NextRequest, NextResponse } from 'next/server';
import { mongo as prisma } from '@/lib/db/mongo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/blob/[id]
 * Retrieves a single blob item with full event history.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const item = await prisma.blobItem.findUnique({
      where: { id },
      include: { events: { orderBy: { created_at: 'desc' } } }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/blob/[id]
 * Deletes a single blob item.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.blobItem.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
