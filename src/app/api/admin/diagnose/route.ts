import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { runL1ValidationSuite } from '@/lib/memory/diagnostics';

export const dynamic = 'force-dynamic';

/**
 * IDENTITY PRISM: L1 DIAGNOSTIC BRIDGE
 * -----------------------------------
 * Heads-less execution of the 16-point stress suite.
 */
export async function POST(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const results = await runL1ValidationSuite();
    const failures = results.filter(r => r.status === 'FAIL');
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.length - failures.length,
        failed: failures.length
      },
      results
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'DIAGNOSTIC_SUITE_CRASHED', 
      message: error.message 
    }, { status: 500 });
  }
}
