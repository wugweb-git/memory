/**
 * Cognitive Orchestrator (L3 Core — Phase 2)
 * -------------------------------------------
 * Pipeline: Context → Prompt → LLM → Sanitize → Dedup → Critic → Log → Return
 */
import { buildContext } from "./contextBuilder";
import { buildPrompt } from "./prompt/builder";
import { runLLM } from "./llm";
import { sanitize } from "./sanitize";
import { dedup } from "./dedup";
import { logDecisionNeon } from "./logging/neon";
import { runCritic } from "./output/critic";
import { getModeInstruction } from "./mode/mode";
import langfuse from "../observability/langfuse";

export async function processDecision(params: {
  userId: string;
  mode: any;
  external_input?: string | null;
}) {
  const { userId, mode, external_input } = params;

  const trace = langfuse.trace({
    name: "cognitive_decide",
    userId,
    input: { mode, external_input }
  });

  try {
    // 1. Build context from L1-L2.5
    const context = await buildContext(userId);

    trace.event({
      name: "context_assembled",
      input: { entities: context.entities.length, signals: context.signals.length }
    });

    // Guard: insufficient data
    if (context.entities.length === 0 && context.signals.length === 0) {
      return {
        status: "insufficient_data",
        message: "Not enough memory data to generate a decision. Ingest more packets first."
      };
    }

    // 2. Build prompt with mode instruction + history
    const prompt = buildPrompt({
      context,
      history: context.recent_decisions,
      mode,
      external_input: external_input ?? undefined,
      modeInstruction: getModeInstruction(mode)
    });

    // 3. LLM call
    const generation = trace.generation({
      name: "reasoning_pass",
      model: "gpt-4o-mini",
      input: prompt
    });
    const rawOutput = await runLLM(prompt);
    generation.end({ output: rawOutput });

    // 4. Sanitize
    const sanitized = sanitize(rawOutput);

    // 5. Dedup against recent decisions
    const deduped = dedup(sanitized, context.recent_decisions);

    // 6. Critic gate (Phase 2)
    const criticReport = runCritic(deduped, context);
    if (!criticReport.approved) {
      deduped.confidence = Math.max(0.1, deduped.confidence - criticReport.confidence_penalty);
      deduped.reasoning  = `[CRITIC: ${criticReport.issues.join('; ')}] ${deduped.reasoning}`;
    }

    if (deduped.recommendations.length === 0) {
      return {
        status: "insufficient_data",
        message: "Suggestions were redundant or context was too thin to generate new recommendations."
      };
    }

    // 7. Log to Postgres (Neon)
    const logId = await logDecisionNeon({ userId, mode, context, output: deduped });
    trace.update({ output: deduped });

    return { decision_id: logId, ...deduped };

  } catch (err: any) {
    trace.event({ name: "error", input: err.message });
    console.error("[Orchestrator] Fatal Error:", err);
    throw err;
  }
}
