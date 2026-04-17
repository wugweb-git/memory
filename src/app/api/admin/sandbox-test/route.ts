import { Sandbox } from "@vercel/sandbox";
import { NextResponse } from "next/server";

/**
 * IDENTITY PRISM: SANDBOX DIAGNOSTIC
 * ---------------------------------
 * Experimental route for executing secure, isolated commands via Vercel Sandbox.
 */

export async function GET() {
  try {
    const sandbox = await Sandbox.create();
    
    // Execute a test command in the isolated env
    const cmd = await sandbox.runCommand("echo", ["Hello from Vercel Sandbox!"]);
    const output = await cmd.stdout();
    
    await sandbox.stop();

    return NextResponse.json({
      success: true,
      output: output.trim(),
      message: "Sandbox environment verified and terminated."
    });
  } catch (error: any) {
    console.error('[Sandbox] Execution failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
