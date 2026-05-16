/**
 * Layer 4 — Persona Evolution Job
 * Runs scheduled persona evolution across all users.
 * Iterates over non-empty fingerprints, re-extracts evidence, and applies
 * slow evolutionary updates to the active persona profile.
 */
import { postgres } from "@/lib/db/postgres";
import { extractPersonaEvidence } from "@/lib/persona/extractor";
import { evolvePersonaField } from "@/lib/persona/evolution";

export interface PersonaEvolutionResult {
  ok: boolean;
  job: "persona-evolution";
  usersProcessed: number;
  evolutionsApplied: number;
  errors: string[];
}

export async function runPersonaEvolutionJob(): Promise<PersonaEvolutionResult> {
  const errors: string[] = [];
  let usersProcessed = 0;
  let evolutionsApplied = 0;

  try {
    // Find all users with recent verified-human fingerprints
    const fingerprints = await postgres.outputFingerprint.findMany({
      where: { verifiedHuman: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      distinct: ["userId"],
    });

    const userIds = [...new Set(fingerprints.map((f) => f.userId))];

    for (const userId of userIds) {
      try {
        // Gather recent verified outputs for this user
        const recentOutputs = await postgres.outputFingerprint.findMany({
          where: { userId, verifiedHuman: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        if (recentOutputs.length === 0) continue;

        // Extract evidence from the most recent output
        for (const output of recentOutputs.slice(0, 3)) {
          const textSource = output.styleVector as Record<string, unknown> | null;
          if (!textSource || !textSource.length) continue;

          // Re-extract persona evidence
          const evidence = await extractPersonaEvidence({
            userId,
            outputText: String(textSource.length),
            sourceLayer: "L4",
            sourceId: output.id,
          });

          // Apply slow evolution to writing style
          await evolvePersonaField({
            userId,
            field: "writingStyle",
            nextValue: evidence.writingStructure as unknown as Record<string, unknown>,
            reason: "scheduled_evolution",
            confidenceWeight: 0.4, // lower weight for batch processing
          });

          evolutionsApplied++;
        }

        usersProcessed++;
      } catch (userErr) {
        errors.push(`User ${userId}: ${(userErr as Error).message}`);
      }
    }
  } catch (err) {
    errors.push(`Job error: ${(err as Error).message}`);
  }

  return {
    ok: errors.length === 0,
    job: "persona-evolution",
    usersProcessed,
    evolutionsApplied,
    errors,
  };
}