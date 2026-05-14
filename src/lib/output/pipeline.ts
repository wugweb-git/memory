import { validateOutput } from "./validator";
import { formatOutput } from "./formatter";
import { scoreOutputQuality } from "./scoring";

export function runOutputPipeline(params: { decisionId: string; content: string; platform: "linkedin" | "medium" | "portfolio" | "note" }) {
  validateOutput({ decisionId: params.decisionId, content: params.content });
  const formatted = formatOutput(params.content, params.platform);
  const quality = scoreOutputQuality(formatted);
  return { formatted, quality };
}
