import { NextResponse } from 'next/server';
import { getBlobStats } from '@/lib/blobLayer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await getBlobStats();
  return NextResponse.json(stats);
}
