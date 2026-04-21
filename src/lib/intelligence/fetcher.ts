import { postgres } from "../db/postgres";

/**
 * L4 Intelligence Fetcher
 * Aggregates behavioral and persona models for context injection.
 */
export async function fetchL4Intelligence(userId: string) {
  try {
    const [traits, preferences, persona, behaviors] = await Promise.all([
      postgres.traitScore.findMany({ where: { userId } }),
      postgres.preference.findMany({ where: { userId } }),
      postgres.personaProfile.findUnique({ where: { userId } }),
      postgres.behaviorModel.findMany({ where: { userId } })
    ]);

    return {
      traits: traits.map(t => ({ trait: t.trait, score: t.score, confidence: t.confidence })),
      preferences: preferences.map(p => ({ category: p.category, key: p.key, value: p.value })),
      persona: persona || { bioSummary: "Standard Identity Model Activated." },
      behaviors: behaviors.filter(b => b.confidence > 0.7).map(b => ({ key: b.key, value: b.value }))
    };
  } catch (err) {
    console.warn("[L4 Fetcher] Failed to retrieve persona intelligence, using defaults.");
    return {
      traits: [],
      preferences: [],
      persona: { bioSummary: "Identity model currently training." },
      behaviors: []
    };
  }
}
