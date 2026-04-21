import { NextRequest, NextResponse } from "next/server";
import { processDecision } from "@/lib/cognitive";

/**
 * POST /api/cognitive/decide
 * Unified endpoint for the Layer 3 Cognitive Engine.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const { user_id, mode = "architect", external_input } = body;

    const result = await processDecision({
      userId: user_id,
      mode: (mode as any), // mode: architect | founder | operator
      external_input: external_input ?? null
    });

    // Check for logical failure states (Insufficient Data)
    if ((result as any).status === "insufficient_data") {
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("[API/Cognitive/Decide] Error:", err);
    return NextResponse.json(
      { 
        error: "Decision Engine failure", 
        details: err.message,
        status: "error"
      },
      { status: 500 }
    );
  }
}
