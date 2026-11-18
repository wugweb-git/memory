import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { cleanupExpiredBlobItems } from '@/lib/blobLayer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  const removed = await cleanupExpiredBlobItems();
  return NextResponse.json({ removed });
}
