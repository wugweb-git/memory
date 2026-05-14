import { NextRequest, NextResponse } from "next/server";
import { detectPersonaDrift } from "@/lib/persona/drift";

export async function GET(req: NextRequest) {
  const baseline = Number(req.nextUrl.searchParams.get("baseline") || 0.5);
  const latest = Number(req.nextUrl.searchParams.get("latest") || 0.5);
  return NextResponse.json(detectPersonaDrift(baseline, latest));
}
