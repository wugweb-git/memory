'use client';

import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { M3Card, M3Page, M3Button } from "@/components/ui/m3";
import { AppShell } from "@/app/component/AppShell";
import { IDENTITY_CONFIG } from "@/config/identity";
import { profilePath } from "@/lib/api/endpoints";
import Link from "next/link";

export default function PortfolioPage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveReference() {
    if (!title.trim() || !url.trim()) {
      toast.error("Title and URL required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(profilePath(IDENTITY_CONFIG.HANDLE, "sections"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reference",
          title: title.trim(),
          content: {
            url: url.trim(),
            summary: summary.trim() || title.trim(),
            source: "Portfolio CMS",
            date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Save failed");
      }
      toast.success("Added to profile references");
      setTitle("");
      setUrl("");
      setSummary("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <ToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Portfolio CMS" subtitle="External references sync to your profile sections">
          <M3Card title="External Reference">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border p-3 text-sm"
              placeholder="Title"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-2xl border p-3 text-sm"
              placeholder="https://..."
            />
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded-2xl border p-3 text-sm min-h-20"
              placeholder="Short summary (optional)"
            />
            <M3Button onClick={saveReference} disabled={saving}>
              {saving ? "Saving…" : "Save to profile"}
            </M3Button>
            <p className="text-xs text-text-tertiary">
              Visible on{" "}
              <Link href={`/p/${IDENTITY_CONFIG.HANDLE}`} className="text-accent underline">
                public profile
              </Link>{" "}
              when type is published or referenced in Published Works merge.
            </p>
          </M3Card>
        </M3Page>
      </div>
    </AppShell>
  );
}
