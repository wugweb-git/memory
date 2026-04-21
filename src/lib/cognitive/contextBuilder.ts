import { mongo } from "../db/mongo";
import { postgres } from "../db/postgres";

/**
 * Builds the bounded context for the Cognitive Engine.
 * Pulls from L1-L2.5 (Mongo) and previous decisions (Postgres).
 * Rule: Only include verified, high-confidence data.
 */
export async function buildContext(userId: string) {
  try {
    const [entities, relationships, signals, recentDecisions] = await Promise.all([
      // 1. Fetch Verified Entities (L2.5)
      mongo.entity.findMany({
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

      // 2. Fetch Relationships (L2.5)
      mongo.relationship.findMany({
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

      // 3. Fetch Recent Signals (L2) — scoped to PROD to avoid test data leaking into decisions
      mongo.signal.findMany({
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

      // 4. Fetch Recent Decisions (L3 History) for Deduplication
      postgres.decisionLog.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: "desc" },
        select: {
          outputJson: true
        }
      }),
      
      // 5. Fetch Persona Intelligence (L4)
      import("../intelligence/resolver").then(m => m.PersonaResolver.resolve(userId))
    ]);

    return {
      entities,
      relationships,
      signals,
      recent_decisions: recentDecisions.map(d => d.outputJson),
      intelligence
    };
  } catch (err) {
    console.warn("[Cognitive/ContextBuilder] Database unavailable, using diagnostic fallback.");
    // Fallback Mock Data for local development / CI
    return {
      entities: [
        { name: "Identity Prism", type: "system", confidence: 1.0 },
        { name: "Neural OS", type: "architecture", confidence: 0.95 }
      ],
      relationships: [],
      signals: [{ type: "system_heartbeat", intensity: 1.0, metadata: { status: "fallback" } }],
      recent_decisions: []
    };
  }
}
