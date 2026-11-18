import { postgres } from "../db/postgres";

/**
 * Layer 4 Digital Twin Persona Resolver
 * -------------------------------------
 * Fetches and resolves the user's specific persona traits, writing style,
 * and cognitive weights. Ensures all AI-generated content sounds like the user.
 */
export class PersonaResolver {
  
  static async resolve(userId: string) {
    try {
      const profile = await postgres.personaProfile.findUnique({
        where: { userId }
      });

      // Traits are written by two subsystems into two tables: the feedback evolver
      // writes `trait_scores`, the persona rebuild writes `behavioral_traits`. Read
      // BOTH and merge (rebuild wins by name) — reading only `trait_scores` meant a
      // persona rebuild never reached the cognitive prompt (the store looked empty).
      const [traitScores, behavioral, preferences] = await Promise.all([
        postgres.traitScore.findMany({ where: { userId } }),
        postgres.behavioralTrait.findMany({ where: { userId }, orderBy: { confidence: "desc" }, take: 24 }),
        postgres.preference.findMany({ where: { userId } }),
      ]);

      const traitMap = new Map<string, { trait: string; score: number }>();
      for (const t of traitScores) traitMap.set(t.trait, { trait: t.trait, score: t.score });
      for (const b of behavioral) traitMap.set(b.traitName, { trait: b.traitName, score: b.traitValue });
      const traits = Array.from(traitMap.values());

      // Standardize voice weights
      const style = preferences.find(p => p.category === "voice" && p.key === "style")?.value || "no fluff, punchy, strategic";
      const perspective = (profile?.decisionStyle as any)?.positioningKeywords || ["executive", "founder"];
      const bioSummary = (profile?.writingStyle as any)?.bioSummary || profile?.displayName || "Identity model in early training phase.";

      return {
        bio_summary: bioSummary,
        traits,
        // Keys the cognitive prompt builder actually reads (`preferences`, `persona`);
        // without them that part of the prompt was always empty.
        preferences: preferences.map(p => ({ category: p.category, key: p.key, value: p.value })),
        persona: { bio_summary: bioSummary, voice: style, perspective },
        // Kept for backward compatibility with any other reader.
        style_weights: { voice: style, perspective },
        decisions_accepted: profile?.updatedAt || new Date() // Metadata placeholder
      };
    } catch (err) {
      console.warn("[PersonaResolver] Failed to fetch L4 data, using defaults.");
      return {
        bio_summary: "Standard Identity Model",
        traits: [],
        preferences: [],
        persona: {},
        style_weights: { voice: "no fluff, punchy", perspective: ["operator"] }
      };
    }
  }
}
