/**
 * Cognitive Orchestrator (L3 Core)
 * --------------------------------
 * The central pipeline for L3 reasoning and decisions.
 */
import { buildContext } from "./contextBuilder";
import { buildPrompt } from "./prompt";
import { runLLM } from "./llm";
import { sanitize } from "./sanitize";
import { dedup } from "./dedup";
import { logDecisionNeon } from "./logging/neon";
import langfuse from "../observability/langfuse";

export async function processDecision(params: {
  userId: string;
  mode: any;
  external_input?: string;
}) {
  const { userId, mode, external_input } = params;

  // 1. Trace Setup (Langfuse)
  const trace = langfuse.trace({
    name: "cognitive_decide",
    userId,
    input: { mode, external_input }
  });

  try {
    // 2. Build Context (L1-L2.5)
    // Intelligence (L4) must be injected here. 
    // We'll create a dedicated resolver for L4 in the next step.
    const context = await buildContext(userId);
    
    trace.event({ name: "context_assembled", input: { 
      entities: context.entities.length, 
      signals: context.signals.length 
    }});

    // 3. Prompt Management
    const prompt = buildPrompt({
      context,
      mode,
      external_input
    });

    // 4. Execution
    const generation = trace.generation({
      name: "reasoning_pass",
      model: "gpt-4o-mini",
      input: prompt
    });

    const rawOutput = await runLLM(prompt);
    generation.end({ output: rawOutput });

    // 5. Sanitization & Dedup
    const sanitized = sanitize(rawOutput);
    const finalDecision = dedup(sanitized, context.recent_decisions);

    if (finalDecision.recommendations.length === 0) {
      return { status: "insufficient_data", message: "Suggestions were redundant or context was too thin." };
    }

    // 6. Persistence (Neon)
    const logId = await logDecisionNeon({
      userId,
      mode,
      context,
      output: finalDecision
    });

    trace.update({ output: finalDecision });

    return {
      decision_id: logId,
      ...finalDecision
    };

  } catch (err: any) {
    trace.event({ name: "error", input: err.message });
    console.error("[Orchestrator] Fatal Error:", err);
    throw err;
  }
}
