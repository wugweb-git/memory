import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";

export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  const history = await (postgres as any).publishedOutput.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(history);
}
