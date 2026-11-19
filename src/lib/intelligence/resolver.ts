import { postgres } from "../db/postgres";

/**
 * Layer 4 Digital Twin Persona Resolver
 * -------------------------------------
 * Fetches and resolves the user's specific persona traits, writing style,
 * and cognitive weights. Ensures all AI-generated content sounds like the user.
 */
type Json = Record<string, unknown> | null | undefined;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

/**
 * Reads the persona fields in the shapes the REBUILD actually writes
 * (rebuild.ts): communicationStyle = {...tone, synthesis:{summary,voice,strengths}},
 * writingStyle = writingStructure + bioSummary, decisionStyle =
 * {sampleCount, avgConfidence, executionFocus, analyticalDepth, positioningKeywords}.
 * Legacy keys (writingStyle.bioSummary, decisionStyle.positioningKeywords) still win
 * when present, so hand-edited profiles keep working.
 */
export function derivePersonaView(input: {
  profile: { displayName?: string | null; communicationStyle?: unknown; writingStyle?: unknown; decisionStyle?: unknown } | null;
  preferences: Array<{ category: string; key: string; value: string }>;
}) {
  const { profile, preferences } = input;
  const comm = (profile?.communicationStyle ?? null) as Json;
  const writing = (profile?.writingStyle ?? null) as Json;
  const decision = (profile?.decisionStyle ?? null) as Json;
  const synthesis = (comm?.synthesis ?? null) as Json;

  const style =
    preferences.find((p) => p.category === "voice" && p.key === "style")?.value ||
    str(synthesis?.voice) ||
    "no fluff, punchy, strategic";

  let perspective = strList(decision?.positioningKeywords);
  if (!perspective.length) {
    const exec = Number(decision?.executionFocus);
    const depth = Number(decision?.analyticalDepth);
    if (Number.isFinite(exec) && Number.isFinite(depth)) {
      perspective = [exec >= depth ? "operator" : "architect"];
    } else {
      perspective = ["executive", "founder"];
    }
  }

  const bioSummary =
    str(writing?.bioSummary) ||
    str(synthesis?.summary) ||
    str(profile?.displayName) ||
    "Identity model in early training phase.";

  return { style, perspective, bioSummary };
}

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

      // Preference.value is a Json column; the persona view and prompt read strings.
      const prefs = preferences.map((p) => ({
        category: p.category,
        key: p.key,
        value: typeof p.value === "string" ? p.value : JSON.stringify(p.value ?? ""),
      }));

      const view = derivePersonaView({
        profile,
        preferences: prefs,
      });
      const { style, perspective, bioSummary } = view;

      return {
        bio_summary: bioSummary,
        traits,
        // Keys the cognitive prompt builder actually reads (`preferences`, `persona`);
        // without them that part of the prompt was always empty.
        preferences: prefs,
        persona: { bio_summary: bioSummary, voice: style, perspective },
        // Kept for backward compatibility with any other reader.
        style_weights: { voice: style, perspective },
        decisions_accepted: profile?.updatedAt || new Date() // Metadata placeholder
      };
    } catch (err) {
      console.warn("[PersonaResolver] Failed to fetch L4 data, using defaults:", err);
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
