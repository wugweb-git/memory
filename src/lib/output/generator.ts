import { runTextLLM } from "../cognitive/llm";
import { resolvePersona } from "./persona";
import { postgres } from "../db/postgres";
import { enforcePersonaStyle } from "@/lib/persona/style";
import { persistFingerprint } from "@/lib/persona/fingerprint";

export type OutputPlatform = "linkedin" | "blog" | "memo" | "medium" | "portfolio" | "other";

const PLATFORM_CONSTRAINTS: Record<OutputPlatform, string> = {
  linkedin: "Punchy, use hooks, high signal-to-noise ratio, structured with line breaks, max 250 words.",
  blog: "In-depth, structured with headings, comprehensive, long-form narrative.",
  memo: "Compressed strategy notes, executive style, bulleted, focus on 'Next Actions'.",
  medium: "In-depth article with clear sections, thoughtful tone, suitable for Medium.",
  portfolio: "Professional case-study style suitable for a portfolio or personal site.",
  other: "Professional and concise.",
};

export function normalizeOutputPlatform(platform: string): OutputPlatform {
  const p = platform.toLowerCase();
  if (p in PLATFORM_CONSTRAINTS) return p as OutputPlatform;
  return "other";
}

/**
 * Generates an external artifact from a decision using the Digital Twin persona.
 * Rule: NO content without decisionId.
 */
export async function generateArtifact(params: {
  userId: string;
  decisionId: string;
  sourceContent: string;
  platform: OutputPlatform;
}) {
  const { userId, decisionId, sourceContent } = params;
  const platform = normalizeOutputPlatform(params.platform);

  if (!decisionId) {
    throw new Error("CORE RULE VIOLATION: NO content without decision_id");
  }

  // 1. Resolve Persona (L4)
  const personaPrompt = await resolvePersona(userId);

  // 2. Build Generation Prompt
  const prompt = `
    You are the Output Engine of the Identity Prism OS.
    Transform the internal L3 decision below into a ${platform.toUpperCase()} post.

    PERSONA ENFORCEMENT (L4 DIGITAL TWIN):
    ${personaPrompt}

    DECISION MATERIAL (L3):
    "${sourceContent}"

    RULES:
    1. Adopt the user's voice PERFECTLY.
    2. SHORT sentences only.
    3. NO FLUFF. NO generic "hooks" or corporate "In today's world" intros.
    4. DIRECT, high-signal tone.
    5. The output must be ready to publish immediately.
    6. Platform Rules: ${PLATFORM_CONSTRAINTS[platform]}

    OUTPUT:
    Return only the content of the post. No markdown headers. No commentary.
  `;

  // 3. Execute LLM (text mode — prose output, not JSON)
  const rawContent = await runTextLLM(prompt);
  const styled = enforcePersonaStyle({
    content: rawContent,
    confidence: 0.75,
    style: { verbosity: platform === "memo" ? "short" : "medium", structure: platform === "memo" ? "bulleted" : "hybrid" },
  });
  const content = styled.content;
  const fingerprint = await persistFingerprint({ userId, text: content, sourceType: "output", sourceId: decisionId });

  // 4. Store in Postgres (Neon)
  const log = await postgres.outputLog.create({
    data: {
      userId,
      decisionId,
      platform,
      content: content,
      status: "draft",
      personaSnapshot: { timestamp: new Date(), source: "L4_active", fingerprint } as any
    }
  });

  return {
    output_id: log.id,
    content: log.content,
    platform: log.platform
  };
}
