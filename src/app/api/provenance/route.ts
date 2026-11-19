import { NextRequest, NextResponse } from "next/server";
import { listProvenance, type ProvenanceSubjectType } from "@/lib/provenance/ledger";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";
import { clampLimit } from "@/lib/validation/http";

export const dynamic = "force-dynamic";

const SUBJECT_TYPES = new Set(["output", "memory_packet", "draft"]);

/** GET — provenance ledger entries (AI-likelihood assessments). Admin only, read-only. */
export async function GET(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "admin:read")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const type = sp.get("subjectType");
  try {
    const records = await listProvenance({
      subjectType: type && SUBJECT_TYPES.has(type) ? (type as ProvenanceSubjectType) : undefined,
      subjectId: sp.get("subjectId") || undefined,
      limit: clampLimit(sp.get("limit"), 50, 200),
    });
    return NextResponse.json({ records });
  } catch (err) {
    console.error("[API/Provenance] failed:", err);
    return NextResponse.json({ error: "Failed to load provenance" }, { status: 500 });
  }
}
