import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "system_user";
  const traits = await (postgres as any).behavioralTrait.findMany({ where: { userId }, orderBy: { confidence: "desc" } });
  return NextResponse.json(traits);
}
