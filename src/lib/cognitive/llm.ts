import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.1,
});

/** Per-(model,temperature) ChatOpenAI cache for the multi-agent path. */
const _modelCache: Record<string, ChatOpenAI> = {};
function getModel(modelName: string, temperature = 0.1): ChatOpenAI {
  const key = `${modelName}:${temperature}`;
  if (!_modelCache[key]) {
    _modelCache[key] = new ChatOpenAI({ modelName, temperature });
  }
  return _modelCache[key];
}

/**
 * Model-parameterized reasoning call used by the Phase 4 multi-agent path.
 * `system` lets each agent assume a strict role.
 */
export async function runAgentLLM(
  prompt: string,
  modelName = "gpt-4o-mini",
  system = "You are the Cognitive Engine of a Personal Operating System. Reason deeply and provide structured guidance.",
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
    const response = await model.invoke([
      new SystemMessage("You are the Cognitive Engine of a Personal Operating System. Reason deeply and provide structured guidance."),
      new HumanMessage(prompt)
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found in environment");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6
      // No response_format — returns raw prose
    })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`LLM_CALL_FAILED: ${res.status} - ${errorBody}`);
  }

  const json = await res.json();
  const text = json.choices[0].message.content;

  if (!text) {
    throw new Error("LLM returned empty content");
  }

  return text.trim();
}
