import { postgres } from "../db/postgres";

/**
 * Resolves the Layer 4 Digital Twin persona for a user.
 * Combines traits, positioning, and style patterns into a prompt fragment.
 */
export async function resolvePersona(userId: string) {
  const [profile, styles, traits] = await Promise.all([
    postgres.personaProfile.findUnique({ where: { userId } }),
    postgres.stylePattern.findMany({ where: { userId }, take: 10 }),
    postgres.traitScore.findMany({ where: { userId }, orderBy: { confidence: 'desc' }, take: 5 })
  ]);

  // Default "Digital Twin" base if no L4 data exists
  const basePersona = {
    tone: "Professional, punchy, high-signal, zero fluff.",
    formatting: "Short sentences. Max 2 sentences per paragraph. Structured with clean dividers.",
    banned_concepts: ["generic motivational quotes", "passive voice", "corporate buzzwords"]
  };

  if (!profile && styles.length === 0 && traits.length === 0) {
    return `
      BASE PERSONALITY:
      Tone: ${basePersona.tone}
      Format: ${basePersona.formatting}
      Guardrails: Do not use ${basePersona.banned_concepts.join(", ")}.
    `;
  }

  return `
    DIGITAL TWIN PROFILE:
    Bio/Context: ${profile?.bioSummary || "N/A"}
    Positioning: ${profile?.positioningKeywords?.join(", ") || "N/A"}
    
    WRITING STYLE PATTERNS:
    ${styles.map(s => `- ${s.pattern}`).join("\n")}
    
    CORE TRAITS:
    ${traits.map(t => `- ${t.trait} (Confidence: ${t.confidence})`).join("\n")}
    
    ENFORCEMENT RULES:
    1. Adopt the style patterns above as primary linguistic markers.
    2. Maintain the tone described in core traits.
    3. Formatting: ${basePersona.formatting}
  `;
}
