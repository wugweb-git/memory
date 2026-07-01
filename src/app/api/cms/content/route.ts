import { NextRequest, NextResponse } from "next/server";
import { listManagedContent, createContent, updateContent, deleteContent, type CmsType } from "@/lib/cms/queries";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

const TYPES = ["project", "caseStudy", "blogPost"];

/** GET — list all managed public content (projects / case studies / blog posts). */
export async function GET() {
  const data = await listManagedContent();
  return NextResponse.json(data);
}

/** POST — create a public content doc in Sanity. */
export async function POST(req: NextRequest) {
  const actor = getRequestUser(req);
  const limit = checkRateLimit(`cms:${actor.userId}`, 40, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { type, ...fields } = body;
  if (!TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  try {
    const doc = await createContent(type as CmsType, fields);
    if (!doc) return NextResponse.json({ error: "Sanity write not configured" }, { status: 503 });
    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

/** PATCH — update fields on an existing doc. */
export async function PATCH(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { _id, ...fields } = body;
  if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 });
  const doc = await updateContent(_id, fields);
  if (!doc) return NextResponse.json({ error: "Sanity write not configured" }, { status: 503 });
  return NextResponse.json(doc);
}

/** DELETE — remove a public content doc. */
export async function DELETE(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "publish")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query required" }, { status: 400 });
  const res = await deleteContent(id);
  if (!res) return NextResponse.json({ error: "Sanity write not configured" }, { status: 503 });
  return NextResponse.json({ deleted: id });
}
