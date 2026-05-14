import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", routing: "active", arbitration: "active", fallback: "active" });
}
