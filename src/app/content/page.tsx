'use client';

import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { M3Button, M3Card, M3Page, M3State } from "@/components/ui/m3";
import { UI_API, resolveUserId } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { AppShell } from "@/app/component/AppShell";
import { OUTPUT_PLATFORMS } from "@/config/ui-content";
import { IDENTITY_CONFIG } from "@/config/identity";
import { profilePath } from "@/lib/api/endpoints";
import Link from "next/link";

export default function OutputStudioPage() {
  const [decisionId, setDecisionId] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [content, setContent] = useState("");
  const [outputId, setOutputId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    try {
      setLoading(true);
      setError(null);
      const json = await apiRequest<{ output_id?: string; content?: string }>(UI_API.outputGenerate, {
        method: "POST",
        body: {
          userId: resolveUserId().userId,
          decisionId,
          sourceContent: content || "Generate output",
          platform,
        },
      });
      setContent(json?.content ?? content);
      if (json?.output_id) setOutputId(json.output_id);
      toast.success("Draft generated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function schedule() {
    const id = outputId || decisionId;
    if (!id) {
      toast.error("Generate content first or provide a decision ID");
      return;
    }
    await apiRequest(UI_API.outputSchedule, {
      method: "POST",
      body: { outputId: id, platform, userId: resolveUserId().userId },
    });
    toast.success("Scheduled for publishing queue");
  }

  async function publishToProfile() {
    const id = outputId;
    if (!id && !content.trim()) {
      toast.error("Generate content first");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(profilePath(IDENTITY_CONFIG.HANDLE, "publish"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resolveUserId().userId,
          outputId: id ?? undefined,
          title: content.split("\n")[0]?.slice(0, 120),
          body: content,
          platform,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Publish failed");
      toast.success("Published to your public profile");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <ToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Output Studio" subtitle="Generate → publish to profile or schedule external push">
          <M3Card title="Compose">
            <input
              className="w-full rounded-2xl border p-3 text-sm"
              placeholder="Decision ID (required)"
              value={decisionId}
              onChange={(e) => setDecisionId(e.target.value)}
            />
            <select
              className="w-full rounded-2xl border p-3 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {OUTPUT_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <textarea
              className="w-full rounded-2xl border p-3 text-sm min-h-36"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Draft content"
            />
            {outputId && (
              <p className="text-[10px] font-mono text-text-tertiary">
                Output ID: {outputId}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <M3Button onClick={generate} disabled={loading || !decisionId}>
                {loading ? "Generating..." : "Generate"}
              </M3Button>
              <M3Button tone="secondary" onClick={publishToProfile} disabled={loading || !content}>
                Publish to profile
              </M3Button>
              <M3Button tone="secondary" onClick={schedule} disabled={!outputId && !decisionId}>
                Schedule queue
              </M3Button>
            </div>
            <p className="text-xs text-text-tertiary">
              Profile posts appear on{" "}
              <Link href={`/p/${IDENTITY_CONFIG.HANDLE}`} className="text-accent underline">
                /p/{IDENTITY_CONFIG.HANDLE}
              </Link>{" "}
              and in workspace Published Works.
            </p>
            {error ? <M3State state="error" message={error} /> : null}
          </M3Card>
        </M3Page>
      </div>
    </AppShell>
  );
}
