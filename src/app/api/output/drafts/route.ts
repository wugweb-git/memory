import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";

export const dynamic = 'force-dynamic';

/** Lists generated drafts (outputLog rows not yet published) for the current user. */
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  const drafts = await postgres.outputLog.findMany({
    where: { userId, status: "draft" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(drafts);
}
