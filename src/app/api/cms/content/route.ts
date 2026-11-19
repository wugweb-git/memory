import { NextRequest, NextResponse } from "next/server";
import { listManagedContent, createContent, updateContent, deleteContent, type CmsType } from "@/lib/cms/queries";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";
import { badRequest, readJsonObject } from "@/lib/validation/http";

export const dynamic = "force-dynamic";

const TYPES = ["project", "caseStudy", "blogPost"];

/** GET — list all managed public content (projects / case studies / blog posts). */
export async function GET() {
  try {
    const data = await listManagedContent();
    return NextResponse.json(data);
  } catch (e) {
    console.error("[API/CMS] list failed:", e);
    return NextResponse.json({ error: "Failed to list content" }, { status: 500 });
  }
}

/** POST — create a public content doc in Sanity. */
export async function POST(req: NextRequest) {
  const actor = getRequestUser(req);
  const limit = await checkRateLimit(`cms:${actor.userId}`, 40, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await readJsonObject(req);
  if (!body) return badRequest("JSON object body required");
  const { type, ...fields } = body;
  if (typeof type !== "string" || !TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  try {
    const doc = await createContent(type as CmsType, fields);
    if (!doc) return NextResponse.json({ error: "Sanity write not configured" }, { status: 503 });
    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    // createContent throws on field validation; anything else is a server fault.
    const validation = /required|invalid|must/i.test(String(e?.message));
    if (!validation) console.error("[API/CMS] create failed:", e);
    return NextResponse.json(
      { error: validation ? e.message : "Failed to create content" },
      { status: validation ? 400 : 500 },
    );
  }
}

/** PATCH — update fields on an existing doc. */
export async function PATCH(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await readJsonObject(req);
  if (!body) return badRequest("JSON object body required");
  const { _id, ...fields } = body;
  if (typeof _id !== "string" || !_id) return badRequest("_id required");
  try {
    const doc = await updateContent(_id, fields);
    if (!doc) return NextResponse.json({ error: "Sanity write not configured" }, { status: 503 });
    return NextResponse.json(doc);
  } catch (e) {
    console.error("[API/CMS] update failed:", e);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}

/** DELETE — remove a public content doc. */
export async function DELETE(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query required" }, { status: 400 });
  try {
    const res = await deleteContent(id);
    if (!res) return NextResponse.json({ error: "Sanity write not configured" }, { status: 503 });
    return NextResponse.json({ deleted: id });
  } catch (e) {
    console.error("[API/CMS] delete failed:", e);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}
