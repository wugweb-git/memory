/**
 * Error Handler
 * -------------
 * Graceful error handling for the Cognitive Engine.
 */

export function handleError(err: any) {
  const msg = err?.message || "";

  if (msg.includes("LLM_CALL_FAILED")) {
    return { status: "error", message: "Reasoning engine was unreachable. Check OPENAI_API_KEY and network." };
  }
  if (msg.includes("INVALID_LLM_OUTPUT_SHAPE") || msg.includes("MISSING_RECOMMENDATIONS_ARRAY") || msg.includes("non-JSON")) {
    return { status: "error", message: "Reasoning engine returned malformed logic." };
  }
  if (msg.includes("Prisma") || msg.includes("database") || msg.includes("connect")) {
    return { status: "error", message: "Database connection failure." };
  }

  return { status: "error", message: "Decision system failure." };
}
