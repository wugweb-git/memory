import { NextRequest, NextResponse } from "next/server";
import { extractPersonaEvidence } from "@/lib/persona/extractor";
import { evolvePersonaField } from "@/lib/persona/evolution";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = body.userId || "system_user";
  const text = body.outputText || "";
  const extracted = await extractPersonaEvidence({ userId, outputText: text, sourceLayer: "L4" });
  await evolvePersonaField({ userId, field: "writingStyle", nextValue: extracted.writingStructure as any, reason: "persona_rebuild" });
  return NextResponse.json({ status: "ok", extracted });
}
