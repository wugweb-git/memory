import { NextResponse } from 'next/server';
import { getBlobStats } from '@/lib/blobLayer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getBlobStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
