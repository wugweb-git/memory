/**
 * Cognitive Orchestrator (L3 Core — Phase 2)
 * -------------------------------------------
 * Pipeline: Context → Prompt → LLM → Sanitize → Dedup → Critic → Log → Return
 */
import { buildContext } from "./contextBuilder";
import { buildPrompt } from "./prompt/builder";
import { runLLMWithMeta } from "./llm";
import { sanitize } from "./sanitize";
import { dedup } from "./dedup";
import { logDecisionNeon } from "./logging/neon";
import { runCritic } from "./output/critic";
import { getModeInstruction } from "./mode/mode";
import { resolveMode } from "./mode/decider-mode";
import { isOpenRouterEnabled } from "@/lib/ai/openrouter";
import { selectModel, selectReasonerModel } from "./routing";
import { runReasoner } from "./agents/reasoner";
import { runDecisionAgent } from "./agents/decision";
import langfuse from "../observability/langfuse";

/** Injectable seams (tests mock the LLM / DB here; production uses the defaults). */
export interface OrchestratorDeps {
  buildContext: typeof buildContext;
  runLLMWithMeta: typeof runLLMWithMeta;
  runReasoner: typeof runReasoner;
  runDecisionAgent: typeof runDecisionAgent;
  logDecision: typeof logDecisionNeon;
}

const defaultDeps: OrchestratorDeps = {
  buildContext,
  runLLMWithMeta,
  runReasoner,
  runDecisionAgent,
  logDecision: logDecisionNeon,
};

export async function processDecision(params: {
  userId: string;
  mode: any;
  external_input?: string | null;
}, depsOverride: Partial<OrchestratorDeps> = {}) {
  const deps = { ...defaultDeps, ...depsOverride };
  const { userId, external_input } = params;
  let mode = params.mode;

  const trace = langfuse.trace({
    name: "cognitive_decide",
    userId,
    input: { mode, external_input }
  });

  try {
    // 1. Build context from L1-L2.5
    const context = await deps.buildContext(userId);

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

    // Optional (DECIDER_MODE=1): route to a mode via the Decider when none was chosen.
    if (process.env.DECIDER_MODE === "1") {
      const routed = await resolveMode(mode, {
        externalInput: external_input,
        entities: context.entities,
        signals: context.signals,
      });
      mode = routed.mode;
      trace.event({ name: "mode_routed", input: { mode: routed.mode, routed: routed.routed } });
    }

    // 2. Build prompt with mode instruction + history
    const prompt = buildPrompt({
      context,
      history: context.recent_decisions,
      mode,
      external_input: external_input ?? undefined,
      modeInstruction: getModeInstruction(mode)
    });

    // 3. Reasoning — single-pass (default) or multi-agent split (Phase 4, opt-in
    //    via COGNITIVE_MULTI_AGENT=1). Both produce the same JSON contract, so
    //    sanitize/dedup/critic/log below are unchanged.
    let rawOutput: string | undefined;
    if (process.env.COGNITIVE_MULTI_AGENT === "1") {
      // COGNITIVE_MODEL_FLOOR=mini pins the decision agent to the cheap tier (selectModel).
      const tier = selectModel({
        contextSize:
          (context.entities?.length || 0) +
          (context.signals?.length || 0) +
          (context.relationships?.length || 0),
        complex: Boolean(external_input),
      });

      try {
        const reasonerModel = selectReasonerModel();
        const reasonGen = trace.generation({ name: "reasoner", model: reasonerModel, input: prompt });
        const analysis = await deps.runReasoner(context, mode, reasonerModel);
        reasonGen.end({ output: analysis });

        const decideGen = trace.generation({ name: "decision", model: tier, input: analysis });
        rawOutput = await deps.runDecisionAgent({ analysis, context, mode, externalInput: external_input, modelName: tier });
        decideGen.end({ output: rawOutput });
      } catch (agentErr: any) {
        // Phase 4 must never make the brain less reliable than the verified path.
        console.error("[Orchestrator] multi-agent path failed, falling back to single-pass:", agentErr?.message);
        trace.event({ name: "multi_agent_fallback", input: agentErr?.message });
        rawOutput = undefined;
      }
    }
    if (rawOutput === undefined) {
      const generation = trace.generation({ name: "reasoning_pass", model: isOpenRouterEnabled() ? "openrouter:decision-chain" : "gpt-4o-mini", input: prompt });
      const llmResult = await deps.runLLMWithMeta(prompt);
      rawOutput = llmResult.text;
      generation.end({ output: rawOutput, model: llmResult.model });
    }

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
    const logId = await deps.logDecision({ userId, mode, context, output: deduped });
    trace.update({ output: deduped });

    return { decision_id: logId, ...deduped };

  } catch (err: any) {
    trace.event({ name: "error", input: err.message });
    console.error("[Orchestrator] Fatal Error:", err);
    throw err;
  } finally {
    // Serverless kills background sends on return — flush before the handler exits.
    // No-op unless Langfuse keys are configured.
    await langfuse.flush();
  }
}
