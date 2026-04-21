import axios from "axios";

/**
 * n8n Automation Bridge
 * ---------------------
 * Handles the distribution of generated artifacts to external platforms
 * via n8n webhooks.
 */
export class AutomationBridge {
  
  private static webhookUrl = process.env.N8N_WEBHOOK_URL;

  static async publish(payload: {
    userId: string;
    artifactType: string;
    content: string;
    metadata?: any;
  }) {
    if (!this.webhookUrl) {
      console.warn("[AutomationBridge] N8N_WEBHOOK_URL not configured. Publication simulated.");
      return { status: "simulated", success: true };
    }

    try {
      const response = await axios.post(this.webhookUrl, {
        ...payload,
        platform_source: "Identity_Prism_POS",
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Source-Key': process.env.BRIDGE_SECRET || "internal_pos"
        }
      });

      return {
        status: "pushed",
        success: response.status === 200,
        ref: response.data?.id || null
      };
    } catch (err: any) {
      console.error("[AutomationBridge] Publication Failed:", err.message);
      return {
        status: "failed",
        success: false,
        error: err.message
      };
    }
  }
}
