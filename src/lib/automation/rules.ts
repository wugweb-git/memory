import { postgres } from "@/lib/db/postgres";
import { listWorkflows, runWorkflow } from "@/lib/workflows/engine";

export const TRIGGER_TYPES = ["output_published", "manual"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export type RuleConditions = { platform?: string; contains?: string };
export type RuleAction = { type: "run_workflow"; workflowName: string; payload?: Record<string, unknown> };

export type RuleInput = {
  triggerType: TriggerType;
  conditions: RuleConditions;
  action: RuleAction;
  enabled: boolean;
};

export type RuleEvent = { type: TriggerType; platform?: string; content?: string; outputId?: string };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Validates a rule body. `partial` allows PATCH-style bodies. */
export function parseRule(
  body: unknown,
  partial = false,
): { ok: true; value: Partial<RuleInput> } | { ok: false; error: string } {
  if (!isObj(body)) return { ok: false, error: "JSON object body required" };
  const out: Partial<RuleInput> = {};

  if (body.triggerType !== undefined || !partial) {
    if (!TRIGGER_TYPES.includes(body.triggerType as TriggerType)) {
      return { ok: false, error: `triggerType must be one of: ${TRIGGER_TYPES.join(", ")}` };
    }
    out.triggerType = body.triggerType as TriggerType;
  }
  if (body.conditions !== undefined || !partial) {
    const c = body.conditions ?? {};
    if (!isObj(c)) return { ok: false, error: "conditions must be an object" };
    const cond: RuleConditions = {};
    if (c.platform !== undefined) {
      if (typeof c.platform !== "string" || !c.platform.trim() || c.platform.length > 50) return { ok: false, error: "conditions.platform invalid" };
      cond.platform = c.platform.trim();
    }
    if (c.contains !== undefined) {
      if (typeof c.contains !== "string" || !c.contains.trim() || c.contains.length > 200) return { ok: false, error: "conditions.contains invalid" };
      cond.contains = c.contains.trim();
    }
    out.conditions = cond;
  }
  if (body.action !== undefined || !partial) {
    const a = body.action;
    if (!isObj(a) || a.type !== "run_workflow") return { ok: false, error: 'action.type must be "run_workflow"' };
    if (typeof a.workflowName !== "string" || !listWorkflows().includes(a.workflowName)) {
      return { ok: false, error: `action.workflowName must be one of: ${listWorkflows().join(", ")}` };
    }
    if (a.payload !== undefined && !isObj(a.payload)) return { ok: false, error: "action.payload must be an object" };
    out.action = { type: "run_workflow", workflowName: a.workflowName, payload: a.payload as Record<string, unknown> | undefined };
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") return { ok: false, error: "enabled must be boolean" };
    out.enabled = body.enabled;
  } else if (!partial) {
    out.enabled = true;
  }
  return { ok: true, value: out };
}

function matches(conditions: RuleConditions | null, event: RuleEvent): boolean {
  const c = conditions ?? {};
  if (c.platform && c.platform !== event.platform) return false;
  if (c.contains && !(event.content ?? "").toLowerCase().includes(c.contains.toLowerCase())) return false;
  return true;
}

/**
 * Minimal evaluator: enabled rules for the user whose trigger and conditions
 * match the event run their workflow. Failures are isolated per rule.
 */
export async function evaluateRules(userId: string, event: RuleEvent, opts: { dryRun?: boolean } = {}) {
  const rules = await postgres.automationRule.findMany({
    where: { userId, enabled: true, triggerType: event.type },
  });
  const results: Array<{ ruleId: string; matched: boolean; ran?: boolean; error?: string }> = [];
  for (const rule of rules) {
    const matched = matches(rule.conditions as RuleConditions | null, event);
    if (!matched) {
      results.push({ ruleId: rule.id, matched });
      continue;
    }
    if (opts.dryRun) {
      results.push({ ruleId: rule.id, matched, ran: false });
      continue;
    }
    const action = rule.action as RuleAction | null;
    if (!action || action.type !== "run_workflow") {
      results.push({ ruleId: rule.id, matched, ran: false, error: "unsupported action" });
      continue;
    }
    const r = await runWorkflow({
      workflowName: action.workflowName,
      payload: { ...(action.payload ?? {}), outputId: event.outputId, triggeredBy: rule.id },
    });
    results.push({ ruleId: rule.id, matched, ran: r.ok, error: r.ok ? undefined : (r as { error?: string | null }).error ?? undefined });
  }
  return results;
}
