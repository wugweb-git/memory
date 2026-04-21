import { NextRequest, NextResponse } from 'next/server';
import { runMemoryAudit } from '@/utils/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const audit = await runMemoryAudit();
    return NextResponse.json(audit);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
