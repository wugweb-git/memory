import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * IDENTITY PRISM: SANDBOX DIAGNOSTIC
 * ---------------------------------
 * Experimental route for executing secure, isolated commands via Vercel Sandbox.
 */

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      output: "Sandbox dependency disabled in this build profile.",
      message: "Diagnostic route is active; external sandbox runtime is not configured."
    });
  } catch (error: any) {
    console.error('[Sandbox] Execution failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
