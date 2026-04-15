import { NextResponse } from 'next/server';
import { cleanupExpiredBlobItems } from '@/lib/blobLayer';

export const dynamic = 'force-dynamic';

export async function POST() {
  const removed = await cleanupExpiredBlobItems();
  return NextResponse.json({ removed });
}
