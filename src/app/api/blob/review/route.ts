import { NextRequest, NextResponse } from 'next/server';
import { Mark_Reviewed } from '@/lib/blobLayer';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const result = await Mark_Reviewed(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
