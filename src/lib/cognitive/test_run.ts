import { processDecision } from "./orchestrator";
import langfuse from "../observability/langfuse";

// Mock data to bypass Mongo timeout for verification
const mockContext = {
  entities: [
    { name: "Project Alpha", type: "project", confidence: 0.9 },
    { name: "Next.js", type: "technology", confidence: 0.95 },
    { name: "Vercel", type: "platform", confidence: 0.88 }
  ],
  signals: [
    { type: "velocity", value: "high", confidence: 0.8 },
    { type: "engagement", value: "active", confidence: 0.7 }
  ],
  relationships: [
    { from: "Project Alpha", to: "Next.js", type: "uses" }
  ]
};

async function test() {
  console.log("Starting mock cognitive run for verification...");
  
  // We'll wrap the orchestrator call or mock the buildContext response if we were doing a full integration test,
  // but here we want to prove the L3 pipeline (Decision -> Neon -> Langfuse) works.
  
  try {
    // We'll trigger a run. To bypass the actual Mongo fetch in orchestrator.ts temporarily for this test:
    // We could temporarily modify orchestrator.ts or just rely on the fact that we want to see the TRACE and OUTPUT.
    
    const result = await processDecision({
      userId: "verification_user",
      mode: "architect",
      external_input: "Evaluate the current tech stack for Project Alpha."
    });
    
    console.log("SUCCESS");
    console.log("DECISION OUTPUT:", JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.log("RUN FAILED (Expected if Mongo is still unreachable)");
    console.error(err);
  } finally {
    // Wait for langfuse to flush
    await langfuse.shutdownAsync();
    process.exit();
  }
}

test();
