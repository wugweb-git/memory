/**
 * Mode Engine
 * -----------
 * Logic for Architect, Founder, and Operator personas.
 */

export function getModeInstruction(mode: string) {
  switch (mode) {
    case "architect":
      return "Focus on systems, dependencies, structure, and long-term technical decisions.";
    case "founder":
      return "Focus on business outcomes, market fit, resource allocation, and venture leverage.";
    case "operator":
      return "Focus on execution, immediate next actions, blockers, and daily momentum.";
    default:
      return "Focus on balanced strategic direction across all domains.";
  }
}
