import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";

export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  const rules = await (postgres as any).automationRule.findMany({ where: { userId } });
  return NextResponse.json(rules);
}
