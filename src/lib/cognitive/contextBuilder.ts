import { postgres } from "../db/postgres";

/**
 * Context Builder (L3.0)
 * ----------------------
 * Assembles bounded, clean context from all lower layers for the Cognitive Engine.
 * Reads from: L1 (mongo memory), L2 (mongo signals), L2.5 (mongo entities/relationships), L4 (postgres intelligence).
 * Writes to: nothing. Strictly read-only.
 *
 * Rules:
 *   - Only verified entities (never unverified)
 *   - Scoped to PROD test_run_id to prevent test data leaking into decisions
 *   - Max 20 entities, 30 relationships, 20 signals
 *   - Last 3 decisions for deduplication
 *   - Throws ContextBuildError if the DB is unavailable (no mock fallback)
 */
export async function buildContext(userId: string) {
  try {
    // All 5 queries run in parallel — never sequential
    const [entities, relationships, signals, recentDecisions, intelligence] = await Promise.all([

      // 1. Verified entities from L2.5 semantic graph
      postgres.entity.findMany({
        where: {
          verified: true,
          processing_state: "complete",
          test_run_id: "PROD"
        },
        take: 20,
        orderBy: { occurrences: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          confidence: true,
          normalized_name: true,
          occurrences: true
        }
      }),

      // 2. Verified relationships from L2.5
      postgres.relationship.findMany({
        where: {
          verified: true,
          test_run_id: "PROD"
        },
        take: 30,
        orderBy: { timestamp: "desc" },
        select: {
          from_entity_id: true,
          to_entity_id: true,
          type: true,
          confidence: true
        }
      }),

      // 3. Recent signals from L2 — PROD only to prevent test data in decisions
      postgres.signal.findMany({
        where: { test_run_id: "PROD" },
        take: 20,
        orderBy: { timestamp: "desc" },
        select: {
          type: true,
          category: true,
          intensity_absolute: true,
          metadata: true
        }
      }),

      // 4. Last 3 L3 decisions for deduplication in dedup.ts
      postgres.decisionLog.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: "desc" },
        select: { outputJson: true }
      }),

      // 5. L4 Persona Intelligence — traits, preferences, style weights
      import("../intelligence/resolver")
        .then(m => m.PersonaResolver.resolve(userId))
        .catch((e) => {
          // L4 is an enrichment, not a fact source: degrade but say so.
          console.warn("[Cognitive/ContextBuilder] L4 intelligence unavailable:", e);
          return { traits: [], preferences: [], persona: {}, degraded: true };
        })
    ]);

    return {
      entities,
      relationships,
      signals,
      recent_decisions: recentDecisions.map(d => d.outputJson),
      intelligence
    };

  } catch (err) {
    // L3 reasons only over real lower-layer data. Returning fabricated "mock"
    // entities/signals here used to make decisions look healthy while the DB was
    // down; surface the failure so the orchestrator/route reports it instead.
    console.error("[Cognitive/ContextBuilder] Failed to assemble context:", err);
    throw new ContextBuildError(err);
  }
}

export class ContextBuildError extends Error {
  readonly code = "CONTEXT_UNAVAILABLE";
  constructor(cause: unknown) {
    super(`Cognitive context unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "ContextBuildError";
    this.cause = cause;
  }
}
