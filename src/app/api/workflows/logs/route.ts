import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await (postgres as any).workflowLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json(logs);
  } catch (err) {
    console.error("[API/Workflows/Logs] failed:", err);
    return NextResponse.json({ error: "Failed to load workflow logs" }, { status: 500 });
  }
}
