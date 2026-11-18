/**
 * Layer 4 — Persona Evolution Job
 * Daily, conservative re-derivation of the persona from REAL stored text
 * (public profile text + recent outputs), via rebuildPersona (which applies the
 * AI-contamination gate and the confidence-gated, logged evolvePersonaField).
 *
 * Safety rules:
 *  - never derive text from styleVector / numbers;
 *  - no new evidence (same evidence hash as the last run) => touch nothing;
 *  - gate failure (too little text, contamination, weak evidence) => write nothing;
 *  - a marker row in persona_evolution_logs records the evidence hash, so the job
 *    is idempotent and the run is visible in the evolution log.
 */
import { createHash } from "node:crypto";
import { postgres } from "@/lib/db/postgres";
import { IDENTITY_CONFIG } from "@/config/identity";
import { collectProfileRebuildText } from "@/lib/persona/rebuild-source";
import { isVerifiedHuman } from "@/lib/persona/fingerprint";
import { rebuildPersona } from "@/lib/persona/rebuild";

export const MIN_SOURCE_TEXT = 40; // matches rebuild.ts gate
export const CONFIDENCE_FLOOR = 0.4; // matches evolvePersonaField gate
export const MARKER_FIELD = "evidence_marker";
export const MARKER_PREFIX = "scheduled_evolution:";

export type EvolutionDecision =
  | { action: "run" }
  | { action: "skip"; reason: "insufficient_source_text" | "no_new_evidence" | "weak_evidence" | "ai_contamination_detected" };

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

/** Same formula rebuildPersona uses for its confidence weight. */
export function evidenceStrength(outputs: number, decisions: number): number {
  return clamp(0.45 + outputs * 0.03 + decisions * 0.02);
}

export function hashEvidence(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/** Pure decision: should the job rebuild/evolve the persona? */
export function decideEvolution(input: {
  textLength: number;
  hash: string;
  lastHash: string | null;
  strength: number;
  verifiedHuman: boolean;
}): EvolutionDecision {
  if (input.textLength < MIN_SOURCE_TEXT) return { action: "skip", reason: "insufficient_source_text" };
  if (input.lastHash !== null && input.lastHash === input.hash) return { action: "skip", reason: "no_new_evidence" };
  if (input.strength < CONFIDENCE_FLOOR) return { action: "skip", reason: "weak_evidence" };
  if (!input.verifiedHuman) return { action: "skip", reason: "ai_contamination_detected" };
  return { action: "run" };
}

export interface PersonaEvolutionResult {
  ok: boolean;
  job: "persona-evolution";
  usersProcessed: number;
  evolutionsApplied: number;
  skipped?: string;
  errors: string[];
}

export async function runPersonaEvolutionJob(): Promise<PersonaEvolutionResult> {
  const errors: string[] = [];
  let usersProcessed = 0;
  let evolutionsApplied = 0;
  let skipped: string | undefined;
  const userId = IDENTITY_CONFIG.DEFAULT_USER_ID; // single-owner system

  try {
    const [profileText, outputs, decisionCount, last] = await Promise.all([
      collectProfileRebuildText(IDENTITY_CONFIG.HANDLE),
      postgres.outputLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true },
      }),
      postgres.decisionLog.count(),
      postgres.personaEvolutionLog.findFirst({
        where: { userId, changedField: MARKER_FIELD },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    usersProcessed = 1;
    const text = [profileText, outputs.map((o) => String(o.content ?? "")).join("\n\n")]
      .filter((s) => s && s.trim())
      .join("\n\n")
      .slice(0, 16_000);
    const hash = hashEvidence(text);
    const lastReason = last?.reason ?? null;
    const lastHash = lastReason && lastReason.startsWith(MARKER_PREFIX) ? lastReason.slice(MARKER_PREFIX.length) : null;
    const strength = evidenceStrength(outputs.length, Math.min(decisionCount, 10));

    // Cheap checks first; only pay for the contamination lookup if they pass.
    const pre = decideEvolution({ textLength: text.length, hash, lastHash, strength, verifiedHuman: true });
    if (pre.action === "skip") {
      skipped = pre.reason;
    } else {
      const verified = await isVerifiedHuman({ userId, text });
      const decision = decideEvolution({ textLength: text.length, hash, lastHash, strength, verifiedHuman: verified });
      if (decision.action === "skip") {
        skipped = decision.reason;
      } else {
        const res = await rebuildPersona({ userId, username: IDENTITY_CONFIG.HANDLE });
        if (res.status === "ok") {
          evolutionsApplied = 1;
          await postgres.personaEvolutionLog.create({
            data: {
              userId,
              changedField: MARKER_FIELD,
              oldValue: lastHash ? ({ hash: lastHash } as any) : undefined,
              newValue: { hash, sourceLength: res.sourceLength } as any,
              reason: `${MARKER_PREFIX}${hash}`,
              confidenceDelta: 0,
            },
          });
        } else {
          skipped = res.reason; // blocked by rebuild's own gates; nothing written
        }
      }
    }
  } catch (err) {
    errors.push(`Job error: ${(err as Error).message}`);
  }

  return { ok: errors.length === 0, job: "persona-evolution", usersProcessed, evolutionsApplied, skipped, errors };
}
