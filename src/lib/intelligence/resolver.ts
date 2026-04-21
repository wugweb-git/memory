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

      const traits = await postgres.traitScore.findMany({
        where: { userId }
      });

      const preferences = await postgres.preference.findMany({
        where: { userId }
      });

      // Standardize voice weights
      const style = preferences.find(p => p.category === "voice" && p.key === "style")?.value || "no fluff, punchy, strategic";

      return {
        bio_summary: profile?.bioSummary || "Identity model in early training phase.",
        traits: traits.map(t => ({ trait: t.trait, score: t.score })),
        style_weights: {
          voice: style,
          perspective: profile?.positioningKeywords || ["executive", "founder"]
        },
        decisions_accepted: profile?.updatedAt || new Date() // Metadata placeholder
      };
    } catch (err) {
      console.warn("[PersonaResolver] Failed to fetch L4 data, using defaults.");
      return {
        bio_summary: "Standard Identity Model",
        traits: [],
        style_weights: { voice: "no fluff, punchy", perspective: ["operator"] }
      };
    }
  }
}
