import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";
import { badRequest, readJsonObject } from "@/lib/validation/http";
import { parseRule } from "@/lib/automation/rules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const userId = getRequestUserId(req);
  const { id } = await ctx.params;
  const parsed = parseRule(await readJsonObject(req), true);
  if (!parsed.ok) return badRequest(parsed.error);
  const v = parsed.value;
  const data: Record<string, unknown> = {};
  if (v.triggerType !== undefined) data.triggerType = v.triggerType;
  if (v.conditions !== undefined) data.conditions = v.conditions;
  if (v.action !== undefined) data.action = v.action;
  if (v.enabled !== undefined) data.enabled = v.enabled;
  if (Object.keys(data).length === 0) return badRequest("No fields to update");
  const res = await postgres.automationRule.updateMany({ where: { id, userId }, data: data as never });
  if (res.count === 0) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json(await postgres.automationRule.findUnique({ where: { id } }));
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const userId = getRequestUserId(req);
  const { id } = await ctx.params;
  const res = await postgres.automationRule.deleteMany({ where: { id, userId } });
  if (res.count === 0) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
