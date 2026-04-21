import { NextRequest, NextResponse } from "next/server";
import { pushToAutomation } from "@/lib/output/automation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outputId } = body;

    if (!outputId) {
      return NextResponse.json({ error: "outputId required" }, { status: 400 });
    }

    const result = await pushToAutomation(outputId);

    return NextResponse.json({ 
      status: "success", 
      message: "Artifact pushed to automation layer",
      payload: result
    });

  } catch (err: any) {
    console.error("[API/Output/Push] Error:", err);
    return NextResponse.json(
      { error: "Automation push failed", details: err.message },
      { status: 500 }
    );
  }
}
