/**
 * Input Parser
 * ------------
 * Checks and cleans external stimuli (JDs, ideas).
 */

export function parseInput(input?: string) {
  if (!input) return null;

  return {
    type: input.length > 200 ? "document_stimulus" : "brief_stimulus",
    content: input.trim()
  };
}
