/**
 * Layer 4 — Fingerprint Validation Job
 * Re-scores borderline fingerprints against their REAL stored text.
 *
 * output_fingerprints stores only a style vector, never the text. The original
 * text is recoverable only when sourceId (a decision id) maps to exactly one
 * output_logs row whose content still matches the stored style vector
 * (length + avgWordLength). Anything else is reported as "no text stored" and
 * left completely untouched. Never re-scores synthetic text.
 */
import { postgres } from "@/lib/db/postgres";
import { scoreAiContamination } from "@/lib/persona/fingerprint";
import type { FingerprintResult } from "@/lib/persona/types";

export interface FingerprintValidationResult {
  ok: boolean;
  job: "fingerprint-validation";
  rechecked: number;
  flagsChanged: number;
  noTextStored: number;
  errors: string[];
}

type StoredVector = { length?: number; avgWordLength?: number } | null | undefined;

/** True only if `text` is demonstrably the text the fingerprint was computed from. */
export function textMatchesVector(text: string, vector: StoredVector): boolean {
  if (!vector || typeof vector.length !== "number" || typeof vector.avgWordLength !== "number") return false;
  if (text.length !== vector.length) return false;
  const words = text.split(/\s+/).filter(Boolean);
  const avg = words.length ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
  return Number(avg.toFixed(2)) === vector.avgWordLength;
}

/** Pure: should the stored row be updated given a fresh score? Idempotent. */
export function needsUpdate(
  stored: { aiProbability: number; humanProbability: number; verifiedHuman: boolean },
  fresh: Pick<FingerprintResult, "aiProbability" | "humanProbability" | "verifiedHuman">,
): boolean {
  const eps = 1e-6;
  return (
    stored.verifiedHuman !== fresh.verifiedHuman ||
    Math.abs(stored.aiProbability - fresh.aiProbability) > eps ||
    Math.abs(stored.humanProbability - fresh.humanProbability) > eps
  );
}

export async function runFingerprintValidationJob(): Promise<FingerprintValidationResult> {
  const errors: string[] = [];
  let rechecked = 0;
  let flagsChanged = 0;
  let noTextStored = 0;

  try {
    const borderline = await postgres.outputFingerprint.findMany({
      where: { aiProbability: { gte: 0.5, lte: 0.85 } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    for (const fp of borderline) {
      try {
        let text: string | null = null;
        if (fp.sourceId) {
          const candidates = await postgres.outputLog.findMany({
            where: { userId: fp.userId, decisionId: fp.sourceId },
            select: { content: true },
            take: 3,
          });
          const matching = candidates.filter((c) => textMatchesVector(String(c.content ?? ""), fp.styleVector as StoredVector));
          if (matching.length === 1) text = String(matching[0].content);
        }
        if (text === null) {
          noTextStored++;
          continue;
        }

        const fresh = scoreAiContamination(text);
        rechecked++;
        if (!needsUpdate(fp, fresh)) continue;

        await postgres.outputFingerprint.update({
          where: { id: fp.id },
          data: {
            aiProbability: fresh.aiProbability,
            humanProbability: fresh.humanProbability,
            verifiedHuman: fresh.verifiedHuman,
          },
        });
        await postgres.personaEvolutionLog.create({
          data: {
            userId: fp.userId,
            changedField: `fingerprint:${fp.id}`,
            oldValue: { aiProbability: fp.aiProbability, humanProbability: fp.humanProbability, verifiedHuman: fp.verifiedHuman } as any,
            newValue: { aiProbability: fresh.aiProbability, humanProbability: fresh.humanProbability, verifiedHuman: fresh.verifiedHuman } as any,
            reason: "fingerprint_revalidation",
            confidenceDelta: 0,
          },
        });
        flagsChanged++;
      } catch (fpErr) {
        errors.push(`Fingerprint ${fp.id}: ${(fpErr as Error).message}`);
      }
    }
  } catch (err) {
    errors.push(`Job error: ${(err as Error).message}`);
  }

  return { ok: errors.length === 0, job: "fingerprint-validation", rechecked, flagsChanged, noTextStored, errors };
}
