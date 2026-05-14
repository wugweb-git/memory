'use client';

import { useState } from "react";
import { M3Button, M3Card, M3Page, M3State } from "@/components/ui/m3";
import { UI_API, resolveUserId } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";

export default function OutputStudioPage() {
  const [decisionId, setDecisionId] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    try {
      setLoading(true); setError(null);
      const json = await apiRequest<any>(UI_API.outputGenerate, {
        method: "POST",
        body: { userId: resolveUserId(), decisionId, sourceContent: content || "Generate output", platform },
      });
      setContent(json?.content || content);
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally { setLoading(false); }
  }

  async function schedule() {
    await apiRequest(UI_API.outputSchedule, {
      method: "POST",
      body: { outputId: decisionId || "manual", platform, userId: resolveUserId() },
    });
  }

  return (
    <M3Page title="Output Studio" subtitle="Decision-first generation, editing, scheduling">
      <M3Card title="Compose">
        <input className="w-full rounded-2xl border p-3 text-sm" placeholder="Decision ID" value={decisionId} onChange={(e) => setDecisionId(e.target.value)} />
        <select className="w-full rounded-2xl border p-3 text-sm" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="linkedin">LinkedIn</option><option value="medium">Medium</option><option value="portfolio">Portfolio</option>
        </select>
        <textarea className="w-full rounded-2xl border p-3 text-sm min-h-36" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Draft content" />
        <div className="flex gap-2">
          <M3Button onClick={generate} disabled={loading || !decisionId}>{loading ? "Generating..." : "Generate"}</M3Button>
          <M3Button tone="secondary" onClick={schedule} disabled={!decisionId}>Schedule</M3Button>
        </div>
        {error ? <M3State state="error" message={error} /> : null}
      </M3Card>
    </M3Page>
  );
}
