/**
 * Layer 4 — Behavioral Reconciliation Job
 * Reconciles behavioral traits against accumulated outputs, feedback, and decisions.
 * Smooths trait values using confidence-weighted averages across multiple evidence sources.
 * Prevents any single signal from dominating a trait value.
 */
import { postgres } from "@/lib/db/postgres";
import { updateBehavioralTrait } from "@/lib/persona/behavior";

export interface BehavioralReconciliationResult {
  ok: boolean;
  job: "behavioral-reconciliation";
  usersProcessed: number;
  traitsReconciled: number;
  errors: string[];
}

export async function runBehavioralReconciliationJob(): Promise<BehavioralReconciliationResult> {
  const errors: string[] = [];
  let usersProcessed = 0;
  let traitsReconciled = 0;

  try {
    // Find all users with feedback memory entries (active users)
    const feedbackUsers = await postgres.feedbackMemory.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });

    const traitUsers = await postgres.behavioralTrait.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIds = [
      ...new Set([
        ...feedbackUsers.map((f) => f.userId),
        ...traitUsers.map((t) => t.userId),
      ]),
    ];

    for (const userId of userIds) {
      try {
        // Get all traits for this user
        const traits = await postgres.behavioralTrait.findMany({
          where: { userId },
          orderBy: { evidenceCount: "desc" },
        });

        if (traits.length === 0) continue;

        // Get recent feedback patterns
        const recentFeedback = await postgres.feedbackMemory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

        const acceptedRatio =
          recentFeedback.length > 0
            ? recentFeedback.filter((f) => f.feedbackType === "accepted").length /
              recentFeedback.length
            : 0.5;

        // Reconcile: adjust alignment_feedback trait based on actual feedback ratio
        const alignmentTrait = traits.find((t) => t.traitName === "alignment_feedback");
        if (alignmentTrait && recentFeedback.length >= 5) {
          const reconciledValue = alignmentTrait.traitValue * 0.7 + acceptedRatio * 0.3;
          const delta = Math.abs(reconciledValue - alignmentTrait.traitValue);

          // Only update if the delta is meaningful (> 0.05)
          if (delta > 0.05) {
            await updateBehavioralTrait({
              userId,
              traitName: "alignment_feedback",
              observedValue: reconciledValue,
              confidence: 0.5, // moderate confidence for reconciliation
              sourceLayer: "L4",
            });
            traitsReconciled++;
          }
        }

        // Check for stale traits (low evidence, old)
        for (const trait of traits) {
          if (trait.evidenceCount <= 1) continue; // skip single-evidence traits

          const daysSinceUpdate =
            (Date.now() - trait.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

          // If trait hasn't been updated in 7+ days and has low evidence, decay it
          if (daysSinceUpdate > 7 && trait.evidenceCount < 5) {
            const decayed = trait.traitValue * 0.95; // gentle decay
            await updateBehavioralTrait({
              userId,
              traitName: trait.traitName,
              observedValue: decayed,
              confidence: trait.confidence * 0.9,
              sourceLayer: "L4",
            });
            traitsReconciled++;
          }
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
    job: "behavioral-reconciliation",
    usersProcessed,
    traitsReconciled,
    errors,
  };
}