import { NextRequest, NextResponse } from "next/server";
import { getRuntimeFeatures, setRuntimeFeatures } from "@/lib/system/features";
import { getRequestUser } from "@/lib/security/auth";
import { hasPermission } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

/** GET — effective feature flags (static defaults merged with runtime overrides).
 *  Public: the app shell reads this to decide which modules to show. */
export async function GET() {
  const features = await getRuntimeFeatures();
  return NextResponse.json({ features });
}

/** PATCH — toggle modules from the System page. Admin only. */
export async function PATCH(req: NextRequest) {
  const actor = getRequestUser(req);
  if (!hasPermission(actor.role, "admin:read")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const patch = body?.features ?? body;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ error: "features object required" }, { status: 400 });
  }
  try {
    const features = await setRuntimeFeatures(patch);
    return NextResponse.json({ features });
  } catch (err) {
    console.error("[system/features] PATCH failed:", err);
    return NextResponse.json({ error: "Could not save module flags" }, { status: 500 });
  }
}
