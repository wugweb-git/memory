import { NextRequest, NextResponse } from 'next/server';
import { bulkBlobAction } from '@/lib/blobLayer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ids = Array.isArray(body?.ids) ? body.ids : [];
  const action = String(body?.action || '');
  if (!ids.length || !action) {
    return NextResponse.json({ error: 'ids and action are required' }, { status: 400 });
  }
  const updated = await bulkBlobAction({ ids, action });
  return NextResponse.json({ updated });
}
