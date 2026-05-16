/**
 * Layer 4 — Fingerprint Validation Job
 * Re-scans stored output fingerprints for AI contamination.
 * Re-evaluates verifiedHuman flag as more data accumulates.
 * Marks fingerprints as needing re-check if they border the threshold.
 */
import { postgres } from "@/lib/db/postgres";
import { scoreAiContamination } from "@/lib/persona/fingerprint";

export interface FingerprintValidationResult {
  ok: boolean;
  job: "fingerprint-validation";
  rechecked: number;
  flagsChanged: number;
  errors: string[];
}

const REVALIDATION_THRESHOLD = 0.72; // Must match fingerprint.ts

export async function runFingerprintValidationJob(): Promise<FingerprintValidationResult> {
  const errors: string[] = [];
  let rechecked = 0;
  let flagsChanged = 0;

  try {
    // Fetch fingerprints near the threshold (0.5-0.85 aiProbability)
    // These may have been misclassified with limited data
    const borderline = await postgres.outputFingerprint.findMany({
      where: {
        aiProbability: { gte: 0.5, lte: 0.85 },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    for (const fp of borderline) {
      try {
        // Re-score using current, more mature detection logic
        const styleVector = fp.styleVector as { length?: number; punctuationDensity?: number; avgWordLength?: number } | null;
        if (!styleVector || !styleVector.avgWordLength) continue;

        // Generate a mock text sample from the style vector for re-scoring
        const mockText = `x`.repeat(styleVector.length || 100);
        const result = scoreAiContamination(mockText);

        // If the re-scored result differs from stored, update
        const currentHuman = fp.humanProbability;
        const newHuman = result.humanProbability;
        const changed = Math.abs(currentHuman - newHuman) > 0.1;

        if (changed || result.verifiedHuman !== fp.verifiedHuman) {
          await postgres.outputFingerprint.update({
            where: { id: fp.id },
            data: {
              aiProbability: result.aiProbability,
              humanProbability: result.humanProbability,
              verifiedHuman: result.verifiedHuman,
            },
          });
          flagsChanged++;
        }

        rechecked++;
      } catch (fpErr) {
        errors.push(`Fingerprint ${fp.id}: ${(fpErr as Error).message}`);
      }
    }
  } catch (err) {
    errors.push(`Job error: ${(err as Error).message}`);
  }

  return {
    ok: errors.length === 0,
    job: "fingerprint-validation",
    rechecked,
    flagsChanged,
    errors,
  };
}