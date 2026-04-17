import { NextRequest, NextResponse } from 'next/server';
import { Reject_Blob_Item } from '@/lib/blobLayer';

export async function POST(req: NextRequest) {
  try {
    const { id, reason } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const result = await Reject_Blob_Item(id, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
