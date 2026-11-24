import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { Reject_Blob_Item, Purge_Blob_Item } from '@/lib/blobLayer';

/**
 * POST { id, reason? }            -> reject: keeps the item with state `rejected` (purged automatically after 30 days).
 * POST { id, purge: true }        -> purge: deletes the item, its payload and derived rows for good.
 */
export async function POST(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const { id, reason, purge } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const result = purge === true ? await Purge_Blob_Item(String(id)) : await Reject_Blob_Item(id, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
