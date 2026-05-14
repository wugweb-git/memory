import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "system_user";
  const history = await (postgres as any).publishedOutput.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(history);
}
