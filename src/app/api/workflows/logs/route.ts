import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export async function GET() {
  const logs = await (postgres as any).workflowLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(logs);
}
