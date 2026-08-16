'use client';

import { useEffect, useMemo, useState } from "react";
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

type Draft = {
  id: string;
  platform: string;
  content: string;
  status: string;
  decisionId?: string | null;
  createdAt?: string;
};

type ProfileSection = {
  id: string;
  type: string;
  title: string;
  content: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

type DecisionRow = { id: string; mode?: string; createdAt?: string };

type Tab = "compose" | "live" | "drafts";

const HANDLE = IDENTITY_CONFIG.HANDLE;

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
function relTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
function sectionBody(s: ProfileSection) {
  return String(s.content?.body ?? s.content?.summary ?? "");
}

/** Lightweight, platform-shaped preview of draft content (pre-publish). */
function PlatformPreview({ platform, content }: { platform: string; content: string }) {
  const lines = content.split("\n").filter(Boolean);
  const title = lines[0] ?? "";
  const body = lines.slice(1).join("\n");

  if (platform === "linkedin") {
    const segs = content.split(/(\s#[\w-]+)/g);
    return (
      <div className="rounded-2xl border border-border-secondary bg-bg-secondary p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-accent/20" />
          <div>
            <p className="text-sm font-bold text-text-primary">{HANDLE}</p>
            <p className="text-2xs text-text-tertiary">LinkedIn · now</p>
          </div>
        </div>
        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
          {segs.map((seg, i) =>
            seg.trim().startsWith("#") ? <span key={i} className="text-accent">{seg}</span> : <span key={i}>{seg}</span>,
          )}
        </p>
      </div>
    );
  }
  if (platform === "memo") {
    return (
      <div className="rounded-2xl border border-border-secondary bg-bg-secondary p-4">
        <pre className="text-xs text-text-primary whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
      </div>
    );
  }
  return (
    <article className="rounded-2xl border border-border-secondary bg-bg-secondary p-5">
      <h3 className="text-base font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{body || content}</p>
    </article>
  );
}

export default function OutputStudioPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const [decisionId, setDecisionId] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [content, setContent] = useState("");
  const [outputId, setOutputId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [versions, setVersions] = useState<{ ts: number; content: string }[]>([]);

  // Live profile (what the world sees)
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [previewKey, setPreviewKey] = useState(0);

  const userId = resolveUserId().userId;

  async function loadDrafts() {
    try {
      const rows = await apiRequest<Draft[]>(UI_API.outputDrafts);
      setDrafts(Array.isArray(rows) ? rows : []);
    } catch { /* empty state */ }
  }
  async function loadDecisions() {
    try {
      const rows = await apiRequest<DecisionRow[]>(UI_API.cognitiveHistory);
      const list = Array.isArray(rows) ? rows.slice(0, 10) : [];
      setDecisions(list);
      // First-run UX: Compose is gated on a Decision ID with no default,
      // which makes the whole page look dead until you know to paste one
      // in. Default to the most recent decision instead.
      if (list.length > 0) setDecisionId((current) => current || list[0].id);
    } catch { /* optional */ }
  }
  async function loadLive() {
    setLiveError(null);
    try {
      const res = await apiRequest<{ sections?: ProfileSection[] }>(profilePath(HANDLE, "sections"));
      setSections(Array.isArray(res?.sections) ? res.sections : []);
      setPreviewKey((k) => k + 1);
    } catch (e: unknown) {
      setLiveError(e instanceof Error ? e.message : "Could not load your profile");
    }
  }

  useEffect(() => {
    loadDrafts();
    loadDecisions();
    loadLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snapshot(next: string) {
    setVersions((v) => [{ ts: Date.now(), content: next }, ...v].slice(0, 10));
  }

  async function generate() {
    if (!decisionId) { toast.error("Pick or enter a decision ID first"); return; }
    try {
      setLoading(true); setError(null);
      const json = await apiRequest<{ output_id?: string; content?: string }>(UI_API.outputGenerate, {
        method: "POST",
        body: { userId, decisionId, sourceContent: content || "Generate output", platform },
        timeoutMs: 30000,
      });
      const next = json?.content ?? content;
      setContent(next);
      if (json?.output_id) setOutputId(json.output_id);
      snapshot(next);
      toast.success("Draft generated");
      loadDrafts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }

  async function schedule() {
    if (!outputId) { toast.error("Generate or open a draft first"); return; }
    try {
      setBusy(true);
      await apiRequest(UI_API.outputSchedule, { method: "POST", body: { outputId, platform, userId } });
      toast.success("Added to the publishing queue");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Schedule failed");
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!outputId) { toast.error("Generate or open a draft first"); return; }
    try {
      setBusy(true);
      const res = await apiRequest<{ sanitySynced?: boolean }>(UI_API.outputPublish, {
        method: "POST", body: { outputId, userId },
      });
      toast.success(res?.sanitySynced ? "Live on your profile — CMS synced" : "Live on your profile");
      setOutputId(null); setContent("");
      loadDrafts();
      await loadLive();
      setTab("live");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally { setBusy(false); }
  }

  function openDraft(d: Draft) {
    setOutputId(d.id); setContent(d.content); setPlatform(d.platform);
    if (d.decisionId) setDecisionId(d.decisionId);
    setVersions([]); setTab("compose");
  }

  function startEdit(s: ProfileSection) {
    setEditingId(s.id); setEditTitle(s.title); setEditBody(sectionBody(s));
  }
  async function saveEdit() {
    if (!editingId) return;
    try {
      setBusy(true);
      await apiRequest(profilePath(HANDLE, "sections"), {
        method: "PATCH",
        body: { sectionId: editingId, title: editTitle, content: { body: editBody, summary: editBody.slice(0, 200) } },
      });
      toast.success("Profile updated");
      setEditingId(null);
      await loadLive();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally { setBusy(false); }
  }
  async function unpublish(s: ProfileSection) {
    if (!confirm(`Remove "${s.title}" from your public profile?`)) return;
    try {
      setBusy(true);
      await apiRequest(`${profilePath(HANDLE, "sections")}?sectionId=${encodeURIComponent(s.id)}`, { method: "DELETE" });
      toast.success("Removed from profile");
      await loadLive();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally { setBusy(false); }
  }

  const words = useMemo(() => wordCount(content), [content]);

  return (
    <AppShell>
      <ToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Output studio" subtitle="Shape what the world sees on your public profile">
          <div className="flex gap-2">
            {([
              ["compose", "Compose"],
              ["live", `Live${sections.length ? ` (${sections.length})` : ""}`],
              ["drafts", `Drafts${drafts.length ? ` (${drafts.length})` : ""}`],
            ] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  tab === id ? "bg-black text-white" : "border border-border-primary bg-white text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ---------- COMPOSE ---------- */}
          {tab === "compose" && (
            <>
              <M3Card title="Compose">
                <div className="space-y-2">
                  <input
                    className="w-full rounded-2xl border border-border-primary p-3 text-sm"
                    placeholder="Decision ID (required)"
                    value={decisionId}
                    onChange={(e) => setDecisionId(e.target.value)}
                  />
                  {decisions.length > 0 && (
                    <select
                      className="w-full rounded-2xl border border-border-primary p-3 text-sm text-text-secondary"
                      value=""
                      onChange={(e) => e.target.value && setDecisionId(e.target.value)}
                    >
                      <option value="">Pick a recent decision…</option>
                      {decisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {(d.mode ? d.mode + " · " : "") + d.id.slice(0, 8)} — {relTime(d.createdAt)}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    className="w-full rounded-2xl border border-border-primary p-3 text-sm"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    {OUTPUT_PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <M3Button onClick={generate} disabled={loading || !decisionId}>
                    {loading ? "Generating…" : outputId ? "Regenerate" : "Generate"}
                  </M3Button>
                  {error ? <M3State state="error" message={error} /> : null}
                </div>
              </M3Card>

              {content && (
                <>
                  <M3Card
                    title="Draft"
                    action={
                      <button onClick={() => setShowPreview((s) => !s)} className="text-2xs font-bold uppercase tracking-wide text-accent">
                        {showPreview ? "Hide preview" : "Show preview"}
                      </button>
                    }
                  >
                    <textarea
                      className="w-full rounded-2xl border border-border-primary p-3 text-sm min-h-44"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onBlur={(e) => e.target.value && snapshot(e.target.value)}
                      placeholder="Draft content"
                    />
                    <div className="flex items-center justify-between text-2xs text-text-tertiary">
                      <span>{words} words · {content.length} chars</span>
                      {outputId && <span className="font-mono">ID: {outputId.slice(0, 8)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <M3Button onClick={publish} disabled={busy || !outputId}>
                        {busy ? "Working…" : "Publish to profile"}
                      </M3Button>
                      <M3Button tone="secondary" onClick={schedule} disabled={busy || !outputId}>
                        Schedule queue
                      </M3Button>
                    </div>
                  </M3Card>

                  {showPreview && (
                    <M3Card title={`${platform} preview`}>
                      <PlatformPreview platform={platform} content={content} />
                    </M3Card>
                  )}

                  {versions.length > 0 && (
                    <M3Card title="Version history">
                      <ul className="space-y-2">
                        {versions.map((v) => (
                          <li key={v.ts} className="flex items-center justify-between gap-3">
                            <span className="text-2xs text-text-tertiary truncate">
                              {new Date(v.ts).toLocaleTimeString()} · {wordCount(v.content)} words
                            </span>
                            <button onClick={() => setContent(v.content)} className="text-2xs font-bold uppercase text-accent shrink-0">
                              Restore
                            </button>
                          </li>
                        ))}
                      </ul>
                    </M3Card>
                  )}
                </>
              )}
            </>
          )}

          {/* ---------- LIVE (public profile) ---------- */}
          {tab === "live" && (
            <>
              <M3Card
                title="On your profile"
                action={
                  <div className="flex items-center gap-3">
                    <Link href={`/p/${HANDLE}`} target="_blank" className="text-2xs font-bold uppercase text-accent">Open</Link>
                    <button onClick={loadLive} className="text-2xs font-bold uppercase text-accent">Refresh</button>
                  </div>
                }
              >
                <p className="text-xs text-text-tertiary mb-2">
                  This is what the world sees at{" "}
                  <Link href={`/p/${HANDLE}`} target="_blank" className="text-accent underline">/p/{HANDLE}</Link>. Manage it here — it stays read-only for visitors.
                </p>
                {liveError ? (
                  <M3State state="error" message={`Couldn't load your profile (${liveError}). The profile store may be unreachable in this environment.`} />
                ) : sections.length === 0 ? (
                  <M3State state="empty" message="Nothing live yet. Publish a draft from Compose." />
                ) : (
                  <ul className="space-y-2">
                    {sections.map((s) => (
                      <li key={s.id} className="rounded-2xl border border-border-secondary bg-white p-3">
                        {editingId === s.id ? (
                          <div className="space-y-2">
                            <input className="w-full rounded-xl border border-border-primary p-2 text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            <textarea className="w-full rounded-xl border border-border-primary p-2 text-sm min-h-28" value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                            <div className="flex gap-2">
                              <M3Button onClick={saveEdit} disabled={busy}>Save</M3Button>
                              <M3Button tone="secondary" onClick={() => setEditingId(null)}>Cancel</M3Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-2xs font-bold uppercase tracking-wide text-success">{s.type}</span>
                              <span className="text-2xs text-text-tertiary">{relTime(s.updatedAt ?? s.createdAt)}</span>
                            </div>
                            <p className="text-sm font-bold text-text-primary mt-1">{s.title}</p>
                            <p className="text-sm text-text-secondary line-clamp-2">{sectionBody(s).slice(0, 180)}</p>
                            <div className="flex gap-3 mt-2">
                              <button onClick={() => startEdit(s)} className="text-2xs font-bold uppercase text-accent">Edit</button>
                              <button onClick={() => unpublish(s)} className="text-2xs font-bold uppercase text-danger">Remove</button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </M3Card>

              <M3Card title="Live preview">
                <div className="rounded-2xl overflow-hidden border border-border-secondary bg-bg-secondary">
                  <iframe
                    key={previewKey}
                    src={`/p/${HANDLE}`}
                    title="Public profile preview"
                    className="w-full h-[520px] bg-white"
                  />
                </div>
              </M3Card>
            </>
          )}

          {/* ---------- DRAFTS ---------- */}
          {tab === "drafts" && (
            <M3Card title="Drafts" action={<button onClick={loadDrafts} className="text-2xs font-bold uppercase text-accent">Refresh</button>}>
              {drafts.length === 0 ? (
                <M3State state="empty" message="No drafts yet. Generate one from a decision." />
              ) : (
                <ul className="space-y-2">
                  {drafts.map((d) => (
                    <li key={d.id}>
                      <button onClick={() => openDraft(d)} className="w-full text-left rounded-2xl border border-border-secondary bg-white p-3 hover:border-border-primary transition">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-bold uppercase tracking-wide text-accent">{d.platform}</span>
                          <span className="text-2xs text-text-tertiary">{relTime(d.createdAt)}</span>
                        </div>
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{d.content.slice(0, 160)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </M3Card>
          )}
        </M3Page>
      </div>
    </AppShell>
  );
}
