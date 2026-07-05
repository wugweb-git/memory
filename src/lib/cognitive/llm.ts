import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { config } from "@/config";

/**
 * Cognitive LLM — provider-flexible.
 * Groq (OpenAI-compatible, fast Llama) is used when GROQ_API_KEY is set;
 * otherwise Gemini. Models overridable via GROQ_MODEL / GEMINI_MODEL.
 */
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GEMINI_DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const DEFAULT_MODEL = config.groqApiKey ? GROQ_DEFAULT_MODEL : GEMINI_DEFAULT_MODEL;

const SYSTEM_PROMPT =
  "You are the Cognitive Engine of a Personal Operating System. Reason deeply and provide structured guidance.";

/** Per-(model,temperature) client cache (shared by single-pass and multi-agent paths). */
const _modelCache: Record<string, BaseChatModel> = {};
function getModel(modelName: string = DEFAULT_MODEL, temperature = 0.1): BaseChatModel {
  const key = `${modelName}:${temperature}`;
  if (!_modelCache[key]) {
    if (config.groqApiKey) {
      _modelCache[key] = new ChatOpenAI({
        modelName,
        temperature,
        apiKey: config.groqApiKey,
        configuration: { baseURL: GROQ_BASE_URL },
      });
    } else if (config.geminiApiKey) {
      _modelCache[key] = new ChatGoogleGenerativeAI({
        model: modelName,
        temperature,
        apiKey: config.geminiApiKey,
      });
    } else {
      throw new Error("No cognitive LLM key configured (GROQ_API_KEY or GEMINI_API_KEY)");
    }
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
