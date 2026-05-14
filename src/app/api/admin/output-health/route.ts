import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", queueSize: 0, failedOutputs: 0, recommendationLatencyMs: 0 });
}
