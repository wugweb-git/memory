import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";
import { requireOwner } from "@/lib/security/auth";
import { extractDelivery, type DeliveryRecord } from "@/lib/publishing/delivery";

export const dynamic = "force-dynamic";

/** One item of the output history response: the PublishedOutput row plus its external delivery outcome. */
export type OutputHistoryItem = Record<string, unknown> & {
  /** External delivery outcome; null for internal-only platforms or rows published before this was recorded. */
  delivery: DeliveryRecord | null;
};

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
    const items: OutputHistoryItem[] = history.map((row: Record<string, unknown>) => ({
      ...row,
      delivery: extractDelivery(row.publishedContent),
    }));
    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Output history error:", error);
    return NextResponse.json({ error: "Could not load output history" }, { status: 500 });
  }
}
