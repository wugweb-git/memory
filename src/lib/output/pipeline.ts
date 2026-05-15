/**
 * Layer 4 — Output Pipeline Integration
 * ALL generated content MUST pass through Layer 4.
 * Pipeline: Decision → Content generation → Persona enforcement → Fingerprint validation → Final output
 */

import { validateOutput } from "./validator";
import { formatOutput } from "./formatter";
import { scoreOutputQuality } from "./scoring";
import { enforcePersonaStyle } from "@/lib/persona/style";
import { isVerifiedHuman, persistFingerprint } from "@/lib/persona/fingerprint";
import { resolvePersona } from "./persona";
import { extractPersonaEvidence } from "@/lib/persona/extractor";
import { evolvePersonaField } from "@/lib/persona/evolution";

export interface PipelineParams {
  userId: string;
  decisionId: string;
  content: string;
  platform: "linkedin" | "medium" | "portfolio" | "note";
}

export interface PipelineResult {
  formatted: string;
  quality: ReturnType<typeof scoreOutputQuality>;
  personaEnforced: boolean;
  fingerprint: {
    aiProbability: number;
    humanProbability: number;
    verifiedHuman: boolean;
  };
  evolutionLogged: boolean;
}

export async function runOutputPipeline(params: PipelineParams): Promise<PipelineResult> {
  const { userId, decisionId, content, platform } = params;

  // Step 1: Validate
  validateOutput({ decisionId, content });

  // Step 2: Format for platform
  let formatted = formatOutput(content, platform);

  // Step 3: Resolve persona and enforce style
  const personaText = await resolvePersona(userId);
  const styleResult = enforcePersonaStyle({
    content: formatted,
    confidence: 0.65,
    style: {
      verbosity: "short",
      structure: platform === "linkedin" ? "paragraph" : "hybrid",
      directness: 0.8,
    },
  });

  if (styleResult.applied) {
    formatted = styleResult.content;
  }

  // Step 4: Fingerprint validation
  const verified = await isVerifiedHuman({ userId, text: formatted });
  await persistFingerprint({ userId, text: formatted, sourceType: platform, sourceId: decisionId });

  // Step 5: Quality score
  const quality = scoreOutputQuality(formatted);

  // Step 6: Extract evidence + evolve persona (only if verified human enough)
  let evolutionLogged = false;
  if (verified) {
    const extracted = await extractPersonaEvidence({ userId, outputText: formatted, sourceLayer: "L4", sourceId: decisionId });
    await evolvePersonaField({
      userId,
      field: "writingStyle",
      nextValue: extracted.writingStructure as unknown as Record<string, unknown>,
      reason: `pipeline_${platform}`,
      confidenceWeight: 0.55,
    });
    evolutionLogged = true;
  }

  return {
    formatted,
    quality,
    personaEnforced: styleResult.applied,
    fingerprint: {
      aiProbability: 1 - (verified ? 0.72 : 0.3),
      humanProbability: verified ? 0.72 : 0.3,
      verifiedHuman: verified,
    },
    evolutionLogged,
  };
}
