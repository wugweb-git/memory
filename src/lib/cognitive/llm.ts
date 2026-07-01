import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { config } from "@/config";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const SYSTEM_PROMPT =
  "You are the Cognitive Engine of a Personal Operating System. Reason deeply and provide structured guidance.";

/** Per-(model,temperature) Gemini client cache (shared by single-pass and multi-agent paths). */
const _modelCache: Record<string, ChatGoogleGenerativeAI> = {};
function getModel(modelName: string = DEFAULT_MODEL, temperature = 0.1): ChatGoogleGenerativeAI {
  const key = `${modelName}:${temperature}`;
  if (!_modelCache[key]) {
    if (!config.geminiApiKey) {
      throw new Error("GEMINI_API_KEY not found in environment");
    }
    _modelCache[key] = new ChatGoogleGenerativeAI({
      model: modelName,
      temperature,
      apiKey: config.geminiApiKey,
    });
  }
  return _modelCache[key];
}

/**
 * Model-parameterized reasoning call used by the Phase 4 multi-agent path.
 * `system` lets each agent assume a strict role.
 */
export async function runAgentLLM(
  prompt: string,
  modelName = DEFAULT_MODEL,
  system = SYSTEM_PROMPT,
  temperature = 0.1,
): Promise<string> {
  try {
    const response = await getModel(modelName, temperature).invoke([
      new SystemMessage(system),
      new HumanMessage(prompt),
    ]);
    return typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  } catch (err: any) {
    console.error("[LLM/Agent] Execution Failure:", err.message);
    throw new Error(`LLM_FAILURE: ${err.message}`);
  }
}

/**
 * Executes a structured reasoning call to the LLM.
 * Returns the raw string result for post-processing.
 */
export async function runLLM(prompt: string): Promise<string> {
  try {
    const response = await getModel(DEFAULT_MODEL, 0.1).invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(prompt),
    ]);

    return typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  } catch (err: any) {
    console.error("[LLM] Execution Failure:", err.message);
    throw new Error(`LLM_FAILURE: ${err.message}`);
  }
}

/**
 * Executes a free-text generation call to the LLM.
 * Used for content generation (posts, memos) where plain prose is required.
 */
export async function runTextLLM(prompt: string): Promise<string> {
  try {
    const response = await getModel(DEFAULT_MODEL, 0.6).invoke([
      new HumanMessage(prompt),
    ]);

    const text = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    if (!text.trim()) {
      throw new Error("LLM returned empty content");
    }

    return text.trim();
  } catch (err: any) {
    console.error("[LLM/Text] Execution Failure:", err.message);
    throw new Error(`LLM_CALL_FAILED: ${err.message}`);
  }
}
