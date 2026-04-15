import { NextRequest, NextResponse } from 'next/server';
import { deleteBlobItem, getBlobItem, patchBlobItem } from '@/lib/blobLayer';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const item = await getBlobItem(params.id);
  if (!item) return NextResponse.json({ error: 'Blob item not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const payload = await req.json();
  const item = await patchBlobItem(params.id, payload);
  if (!item) return NextResponse.json({ error: 'Blob item not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const ok = await deleteBlobItem(params.id);
  if (!ok) return NextResponse.json({ error: 'Blob item not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
