import { postgres } from "@/lib/db/postgres";

/**
 * Resolves the Layer 4 Digital Twin persona for a user.
 * Combines traits, positioning, and style patterns into a prompt fragment.
 */
export async function resolvePersona(userId: string): Promise<string> {
  const [profile, patterns, traits] = await Promise.all([
    postgres.personaProfile.findUnique({ where: { userId } }),
    postgres.communicationPattern.findMany({ where: { userId }, take: 10, orderBy: { createdAt: "desc" } }),
    postgres.behavioralTrait.findMany({ where: { userId }, orderBy: { confidence: "desc" }, take: 6 }),
  ]);

  // Default "Digital Twin" base if no L4 data exists
  const basePersona = {
    tone: "Professional, punchy, high-signal, zero fluff.",
    formatting: "Short sentences. Max 2 sentences per paragraph. Structured with clean dividers.",
    banned_concepts: ["generic motivational quotes", "passive voice", "corporate buzzwords"],
  };

  if (!profile && patterns.length === 0 && traits.length === 0) {
    return `
BASE PERSONALITY:
Tone: ${basePersona.tone}
Format: ${basePersona.formatting}
Guardrails: Do not use ${basePersona.banned_concepts.join(", ")}.
    `.trim();
  }

  return `
DIGITAL TWIN PROFILE:
Display Name: ${profile?.displayName || "N/A"}
Communication Style: ${JSON.stringify(profile?.communicationStyle || {})}
Writing Style: ${JSON.stringify(profile?.writingStyle || {})}
Decision Style: ${JSON.stringify(profile?.decisionStyle || {})}

WRITING STYLE PATTERNS:
${patterns.map((s) => `- ${s.patternType}: ${JSON.stringify(s.patternValue || {})}`).join("\n")}

CORE TRAITS:
${traits.map((t) => `- ${t.traitName}: ${t.traitValue} (Confidence: ${t.confidence})`).join("\n")}

ENFORCEMENT RULES:
1. Adopt the style patterns above as primary linguistic markers.
2. Maintain the tone described in core traits.
3. Formatting: ${basePersona.formatting}
  `.trim();
}
