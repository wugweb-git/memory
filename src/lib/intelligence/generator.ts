import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { PersonaResolver } from "./resolver";

const model = new ChatOpenAI({
  modelName: "gpt-4o", // Higher fidelity for content generation
  temperature: 0.7
});

export type ArtifactType = "linkedin" | "memo" | "blog";

/**
 * Multi-Platform Generator
 * ------------------------
 * Transforms Layer 3 strategic decisions into high-fidelity artifacts 
 * enforced with Layer 4 persona intelligence.
 */
export class ArtifactGenerator {
  
  static async generate(userId: string, decision: string, type: ArtifactType) {
    const persona = await PersonaResolver.resolve(userId);

    const prompt = `
      As the Digital Twin of a user with the following persona:
      BIO: ${persona.bio_summary}
      STYLE: ${persona.style_weights.voice}
      TRAITS: ${persona.traits.map(t => t.trait).join(", ")}

      Transform the following STRATEGIC DECISION into a ${type.toUpperCase()} post.
      DECISION: "${decision}"

      GUIDELINES:
      - Enforce the persona's voice strictly.
      - ${type === "linkedin" ? "Keep it professional, punchy, and include 3 relevant hashtags." : ""}
      - ${type === "memo" ? "Format as a structured internal strategic memo." : ""}
      - ${type === "blog" ? "Format as a long-form thought-leadership draft." : ""}
      - NO generic opening ("I'm excited to share", "Reflecting on").
    `;

    const response = await model.invoke([
      new SystemMessage(`You are a high-fidelity content generator. Your voice is ${persona.style_weights.voice}.`),
      new HumanMessage(prompt)
    ]);

    return {
      content: response.content,
      type,
      generated_at: new Date(),
      persona_applied: true
    };
  }
}
