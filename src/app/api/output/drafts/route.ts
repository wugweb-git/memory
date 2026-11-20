import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";
import { requireOwner } from "@/lib/security/auth";

export const dynamic = 'force-dynamic';

/** Lists generated drafts (outputLog rows not yet published) for the current user. */
export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const userId = getRequestUserId(req);
  const drafts = await postgres.outputLog.findMany({
    where: { userId, status: "draft" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(drafts);
}

/** Saves edits to a draft's content/platform (only while it is still a draft). */
export async function PATCH(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const userId = getRequestUserId(req);
  let body: { id?: string; content?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "id and non-empty content required" }, { status: 400 });
  }
  try {
    const res = await postgres.outputLog.updateMany({
      where: { id: body.id, userId, status: "draft" },
      data: {
        content: body.content,
        ...(typeof body.platform === "string" && body.platform ? { platform: body.platform } : {}),
      },
    });
    if (res.count === 0) return NextResponse.json({ error: "Draft not found or already published" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API/Output/Drafts] PATCH failed:", err);
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 });
  }
}
