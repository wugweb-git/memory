import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";
import { requireOwner } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  try {
    const userId = getRequestUserId(req);
    const history = await (postgres as any).publishedOutput.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Output history error:", error);
    return NextResponse.json({ error: "Could not load output history" }, { status: 500 });
  }
}
