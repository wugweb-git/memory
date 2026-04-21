import { NextRequest, NextResponse } from "next/server";
import { generateArtifact } from "@/lib/output/generator";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, decisionId, sourceContent, platform } = body;

    if (!userId || !decisionId || !sourceContent || !platform) {
      return NextResponse.json(
        { error: "Missing required fields. decisionId is mandatory." }, 
        { status: 400 }
      );
    }

    const result = await generateArtifact({
      userId,
      decisionId,
      sourceContent,
      platform
    });

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("[API/Output/Generate] Error:", err);
    return NextResponse.json(
      { error: "Generation failed", details: err.message },
      { status: 500 }
    );
  }
}
