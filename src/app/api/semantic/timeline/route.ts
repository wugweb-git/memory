import { NextResponse } from "next/server";
import { buildSemanticTimeline } from "@/lib/semantic/timeline";

export async function GET() {
  return NextResponse.json(buildSemanticTimeline([]));
}
