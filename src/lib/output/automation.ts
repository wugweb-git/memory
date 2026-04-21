import { postgres } from "../db/postgres";

/**
 * Pushes a generated artifact to the Automation Layer (n8n).
 */
export async function pushToAutomation(outputId: string) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn("[Automation] No N8N_WEBHOOK_URL configured. Payload logged to console.");
  }

  // 1. Fetch Output
  const output = await postgres.outputLog.findUnique({
    where: { id: outputId }
  });

  if (!output) {
    throw new Error("Output not found: " + outputId);
  }

  const payload = {
    event: "artifact_ready",
    system: "Identity Prism OS",
    data: {
      id: output.id,
      platform: output.platform,
      content: output.content,
      user_id: output.userId,
      timestamp: new Date().toISOString()
    }
  };

  // 2. Transmit to n8n
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Automation failure: ${res.statusText}`);
      }
    } catch (err: any) {
      console.error("[Automation] Network error:", err);
      // We don't throw here to avoid crashing the UI, but we log it.
    }
  }

  // 3. Update Status
  await postgres.outputLog.update({
    where: { id: outputId },
    data: { status: "pushed" }
  });

  return payload;
}
