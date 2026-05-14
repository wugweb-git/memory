import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "system_user";
  const rules = await (postgres as any).automationRule.findMany({ where: { userId } });
  return NextResponse.json(rules);
}
