export function validateOutput(params: { decisionId?: string; content: string }) {
  if (!params.decisionId) throw new Error("NO_OUTPUT_WITHOUT_DECISION_ID");
  if (!params.content?.trim()) throw new Error("EMPTY_OUTPUT");
  return { valid: true };
}
