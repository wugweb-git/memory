import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", scoring: "active", suppression: "active", timing: "active", fatigue: "active" });
}
