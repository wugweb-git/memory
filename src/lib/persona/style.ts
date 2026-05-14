const PASSIVE_REGEX = /\b(was|were|is|are|been|being)\s+\w+ed\b/gi;

export interface StyleEnforcementInput {
  content: string;
  style?: {
    directness?: number;
    verbosity?: "short" | "medium" | "long";
    structure?: "bulleted" | "paragraph" | "hybrid";
  };
  confidence?: number;
}

export function enforcePersonaStyle(input: StyleEnforcementInput) {
  const confidence = input.confidence ?? 0.5;
  if (confidence < 0.55) {
    return { content: input.content, applied: false, reason: "low_confidence" };
  }

  let output = input.content.replace(PASSIVE_REGEX, (m) => m.replace(/\b(was|were|is|are|been|being)\b/i, ""));
  output = output.replace(/\n{3,}/g, "\n\n").trim();

  if (input.style?.verbosity === "short") {
    output = output
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join("\n");
  }

  if (input.style?.structure === "bulleted" && !/^[\-*]\s/m.test(output)) {
    output = output
      .split(/[\n.]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `- ${s}`)
      .join("\n");
  }

  return { content: output, applied: true, reason: "style_enforced" };
}
