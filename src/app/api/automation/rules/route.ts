import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";
import { badRequest, readJsonObject } from "@/lib/validation/http";
import { parseRule } from "@/lib/automation/rules";

export const dynamic = "force-dynamic";

// Auth: middleware default-denies everything except the owner session.
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  const rules = await postgres.automationRule.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const userId = getRequestUserId(req);
  const body = await readJsonObject(req);
  const parsed = parseRule(body);
  if (!parsed.ok) return badRequest(parsed.error);
  const v = parsed.value;
  const rule = await postgres.automationRule.create({
    data: {
      userId,
      triggerType: v.triggerType,
      conditions: (v.conditions ?? {}) as never,
      action: v.action as never,
      enabled: v.enabled ?? true,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
