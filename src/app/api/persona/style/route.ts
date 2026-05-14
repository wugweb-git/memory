import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "system_user";
  const profile = await (postgres as any).personaProfile.findUnique({ where: { userId } });
  return NextResponse.json({
    writingStyle: profile?.writingStyle || {},
    communicationStyle: profile?.communicationStyle || {},
    decisionStyle: profile?.decisionStyle || {},
    confidenceScore: profile?.confidenceScore ?? 0.5,
  });
}
