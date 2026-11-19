'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Check } from "lucide-react";
import { AppToastContainer } from "@/app/component/AppToastContainer";
import "react-toastify/dist/ReactToastify.css";
import { M3Button, M3Card, M3Page, M3State } from "@/components/ui/m3";
import { EmptyState, Input, Skeleton } from "@/components/ui/primitives";
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
  content: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type DecisionRow = { id: string; mode?: string; createdAt?: string };

type Tab = "compose" | "live" | "drafts";

const HANDLE = IDENTITY_CONFIG.HANDLE;

const FIELD_CLS =
  "w-full min-h-11 rounded-xl border border-border-primary bg-bg-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";
const LINK_BTN =
  "inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-accent transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const LEAVE_MESSAGE = "You have unsaved changes to this draft. Discard them?";

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
          <div className="h-8 w-8 rounded-full bg-accent/20" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-text-primary">{HANDLE}</p>
            <p className="text-2xs text-text-tertiary">LinkedIn, now</p>
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

/** Guided path: pick a decision, edit the draft, publish. One current step at a time. */
function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Pick a decision", "Edit the draft", "Publish"];
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={`flex min-w-0 flex-1 items-center gap-2 text-xs ${current ? "font-semibold text-text-primary" : "text-text-tertiary"}`}
          >
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-2xs font-bold ${
                done
                  ? "border-success bg-success text-bg-primary"
                  : current
                    ? "border-text-primary bg-text-primary text-bg-primary"
                    : "border-border-primary text-text-tertiary"
              }`}
            >
              {done ? <Check size={12} strokeWidth={3} /> : n}
            </span>
            <span className="truncate">{label}</span>
            <span className="sr-only">{done ? " (done)" : current ? " (current step)" : ""}</span>
          </li>
        );
      })}
    </ol>
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
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState("");
  const [versions, setVersions] = useState<{ ts: number; content: string }[]>([]);

  // Live profile (what the world sees)
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editOriginal, setEditOriginal] = useState({ title: "", body: "" });
  const [previewKey, setPreviewKey] = useState(0);

  const userId = resolveUserId().userId;

  const dirty = content.trim() !== "" && content !== savedContent;
  const editDirty = editingId !== null && (editTitle !== editOriginal.title || editBody !== editOriginal.body);
  const step: 1 | 2 | 3 = !content ? 1 : dirty ? 2 : 3;

  // Warn before the browser tab closes or reloads with unsaved work.
  useEffect(() => {
    if (!dirty && !editDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, editDirty]);

  /** True when it is safe to replace the draft in the editor. */
  function canReplaceDraft() {
    return !dirty || window.confirm(LEAVE_MESSAGE);
  }

  const loadDrafts = useCallback(async () => {
    setDraftsError(null);
    setDraftsLoading(true);
    try {
      const rows = await apiRequest<Draft[]>(UI_API.outputDrafts);
      setDrafts(Array.isArray(rows) ? rows : []);
    } catch (e: unknown) {
      setDraftsError(e instanceof Error ? e.message : "Could not load drafts");
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  const loadDecisions = useCallback(async () => {
    try {
      const rows = await apiRequest<DecisionRow[]>(UI_API.cognitiveHistory);
      const list = Array.isArray(rows) ? rows.slice(0, 10) : [];
      setDecisions(list);
      // First-run UX: default to the most recent decision so Compose never
      // looks dead before you know to paste an ID.
      if (list.length > 0) setDecisionId((current) => current || list[0].id);
    } catch { /* optional */ }
  }, []);

  const loadLive = useCallback(async () => {
    setLiveError(null);
    setLiveLoading(true);
    try {
      const res = await apiRequest<{ sections?: ProfileSection[] }>(profilePath(HANDLE, "sections"));
      setSections(Array.isArray(res?.sections) ? res.sections : []);
      setPreviewKey((k) => k + 1);
    } catch (e: unknown) {
      setLiveError(e instanceof Error ? e.message : "Could not load your profile");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    loadDecisions();
    loadLive();
  }, [loadDrafts, loadDecisions, loadLive]);

  function snapshot(next: string) {
    setVersions((v) => [{ ts: Date.now(), content: next }, ...v].slice(0, 10));
  }

  function stamp() {
    setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }

  async function generate() {
    if (!decisionId) { toast.error("Pick or enter a decision ID first"); return; }
    if (!canReplaceDraft()) return;
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
      setSavedContent(next);
      snapshot(next);
      stamp();
      toast.success("Draft generated and saved");
      loadDrafts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }

  /** Persist textarea edits so publish/schedule act on what the user sees. */
  async function persistEdits() {
    if (!outputId || content === savedContent) return;
    if (!content.trim()) throw new Error("Draft is empty");
    await apiRequest(UI_API.outputDrafts, { method: "PATCH", body: { id: outputId, content, platform } });
    setSavedContent(content);
    stamp();
  }

  async function saveDraft() {
    if (!outputId) { toast.error("Generate or open a draft first"); return; }
    try {
      setBusy(true);
      await persistEdits();
      toast.success("Draft saved");
      loadDrafts();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  }

  async function schedule() {
    if (!outputId) { toast.error("Generate or open a draft first"); return; }
    try {
      setBusy(true);
      await persistEdits();
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
      await persistEdits();
      const res = await apiRequest<{ sanitySynced?: boolean }>(UI_API.outputPublish, {
        method: "POST", body: { outputId, userId },
      });
      toast.success(res?.sanitySynced ? "Published to your profile and CMS" : "Published to your profile");
      setOutputId(null); setContent(""); setSavedContent(""); setVersions([]); setLastSaved(null);
      loadDrafts();
      await loadLive();
      setTab("live");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally { setBusy(false); }
  }

  function openDraft(d: Draft) {
    if (!canReplaceDraft()) return;
    setOutputId(d.id); setContent(d.content); setSavedContent(d.content); setPlatform(d.platform);
    if (d.decisionId) setDecisionId(d.decisionId);
    setVersions([]); setLastSaved(null); setTab("compose");
  }

  function startEdit(s: ProfileSection) {
    const body = sectionBody(s);
    setEditingId(s.id); setEditTitle(s.title); setEditBody(body);
    setEditOriginal({ title: s.title, body });
  }
  function cancelEdit() {
    if (editDirty && !window.confirm("Discard your changes to this section?")) return;
    setEditingId(null);
  }
  async function saveEdit() {
    if (!editingId) return;
    if (!editTitle.trim()) { toast.error("Title can't be empty"); return; }
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

  const tabs: [Tab, string][] = [
    ["compose", dirty ? "Compose (unsaved)" : "Compose"],
    ["live", `Live${sections.length ? ` (${sections.length})` : ""}`],
    ["drafts", `Drafts${drafts.length ? ` (${drafts.length})` : ""}`],
  ];

  const saveStatus = !content
    ? ""
    : dirty
      ? "Unsaved changes"
      : lastSaved
        ? `All changes saved at ${lastSaved}`
        : "All changes saved";

  return (
    <AppShell>
      <AppToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Output studio" subtitle="Write a draft from a decision, review it, then publish it to your public profile">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Output studio sections">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                type="button"
                onClick={() => setTab(id)}
                className={`min-h-11 px-4 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tab === id ? "bg-text-primary text-bg-primary" : "border border-border-primary bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ---------- COMPOSE ---------- */}
          {tab === "compose" && (
            <>
              <Stepper step={step} />

              <M3Card title="1. Source">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="compose-decision" className="block text-sm font-medium text-text-primary">Decision</label>
                    <Input
                      id="compose-decision"
                      className="min-h-11 text-base"
                      placeholder="Paste a decision ID"
                      aria-required="true" required
                      aria-invalid={error && !decisionId ? true : undefined}
                      aria-describedby={error && !decisionId ? "compose-error compose-decision-hint" : "compose-decision-hint"}
                      autoComplete="off"
                      value={decisionId}
                      onChange={(e) => setDecisionId(e.target.value)}
                    />
                    <p id="compose-decision-hint" className="text-xs text-text-tertiary">
                      The draft is written from this decision. We filled in your latest one.
                    </p>
                  </div>
                  {decisions.length > 0 && (
                    <div className="space-y-1">
                      <label htmlFor="compose-recent" className="block text-sm font-medium text-text-primary">Recent decisions</label>
                      <select
                        id="compose-recent"
                        className={`${FIELD_CLS} text-text-secondary`}
                        value=""
                        onChange={(e) => e.target.value && setDecisionId(e.target.value)}
                      >
                        <option value="">Choose a recent decision</option>
                        {decisions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {(d.mode ? d.mode + ": " : "") + d.id.slice(0, 8)} on {relTime(d.createdAt)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label htmlFor="compose-platform" className="block text-sm font-medium text-text-primary">Format</label>
                    <select
                      id="compose-platform"
                      className={FIELD_CLS}
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                    >
                      {OUTPUT_PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  {content ? (
                    <M3Button tone="secondary" onClick={generate} disabled={loading || !decisionId}>
                      {loading ? "Generating…" : "Regenerate draft"}
                    </M3Button>
                  ) : (
                    <M3Button onClick={generate} disabled={loading || !decisionId}>
                      {loading ? "Generating…" : "Generate draft"}
                    </M3Button>
                  )}
                  {loading ? <p role="status" className="text-xs text-text-tertiary">This can take up to 30 seconds.</p> : null}
                  {error ? (
                    <div id="compose-error" role="alert" className="space-y-1">
                      <M3State state="error" message={`${error}. Check the decision ID and try again.`} />
                    </div>
                  ) : null}
                </div>
              </M3Card>

              {loading && !content ? (
                <div className="space-y-2" aria-hidden="true">
                  <Skeleton className="h-6 w-1/3 motion-reduce:animate-none" />
                  <Skeleton className="h-40 w-full motion-reduce:animate-none" />
                </div>
              ) : null}

              {!content && !loading ? (
                <EmptyState
                  title="No draft yet"
                  hint="Generate a draft from your decision. You can edit it before anything goes public."
                />
              ) : null}

              {content && (
                <>
                  <M3Card
                    title="2. Edit the draft"
                    action={
                      <button
                        type="button"
                        aria-pressed={showPreview}
                        onClick={() => setShowPreview((s) => !s)}
                        className={LINK_BTN}
                      >
                        {showPreview ? "Hide preview" : "Show preview"}
                      </button>
                    }
                  >
                    <label htmlFor="compose-draft" className="sr-only">Draft content</label>
                    <textarea
                      id="compose-draft"
                      className={`${FIELD_CLS} min-h-44`}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onBlur={(e) => e.target.value && snapshot(e.target.value)}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-tertiary">
                      <span>{words} words, {content.length} characters</span>
                      <span
                        role="status"
                        aria-live="polite"
                        className={dirty ? "font-semibold text-warning" : "text-text-tertiary"}
                      >
                        {saveStatus}
                      </span>
                    </div>
                    <div className="space-y-2 border-t border-border-secondary pt-3">
                      <p className="text-xs text-text-tertiary">
                        {outputId
                          ? "3. Publish puts this draft on your public profile. Your edits are saved first."
                          : "Generate or open a draft to publish it."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <M3Button onClick={publish} disabled={busy || !outputId}>
                          {busy ? "Working…" : "Publish to profile"}
                        </M3Button>
                        <M3Button tone="secondary" onClick={saveDraft} disabled={busy || !outputId || !dirty}>
                          Save draft
                        </M3Button>
                        <M3Button tone="secondary" onClick={schedule} disabled={busy || !outputId}>
                          Add to queue
                        </M3Button>
                      </div>
                    </div>
                  </M3Card>

                  {showPreview && (
                    <M3Card title={`${platform} preview`}>
                      <PlatformPreview platform={platform} content={content} />
                    </M3Card>
                  )}

                  {versions.length > 0 && (
                    <M3Card title="Version history">
                      <ul className="space-y-1">
                        {versions.map((v) => (
                          <li key={v.ts} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-text-tertiary truncate">
                              {new Date(v.ts).toLocaleTimeString()}, {wordCount(v.content)} words
                            </span>
                            <button
                              type="button"
                              onClick={() => setContent(v.content)}
                              aria-label={`Restore version from ${new Date(v.ts).toLocaleTimeString()}`}
                              className={`${LINK_BTN} shrink-0`}
                            >
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
                  <div className="flex items-center gap-1">
                    <Link href={`/p/${HANDLE}`} target="_blank" rel="noopener noreferrer" className={LINK_BTN}>Open<span className="sr-only"> (opens in a new tab)</span></Link>
                    <button type="button" onClick={loadLive} className={LINK_BTN}>Refresh</button>
                  </div>
                }
              >
                <p className="text-xs text-text-tertiary">
                  This is what visitors see at{" "}
                  <Link href={`/p/${HANDLE}`} target="_blank" rel="noopener noreferrer" className="text-accent underline">/p/{HANDLE}<span className="sr-only"> (opens in a new tab)</span></Link>. Edit or remove sections here.
                </p>
                {liveLoading && sections.length === 0 && !liveError ? (
                  <div className="space-y-2" aria-hidden="true">
                    <Skeleton className="h-20 w-full motion-reduce:animate-none" />
                    <Skeleton className="h-20 w-full motion-reduce:animate-none" />
                  </div>
                ) : liveError ? (
                  <div className="space-y-2">
                    <M3State state="error" message={`Couldn't load your profile (${liveError}). The profile store may be unreachable in this environment.`} />
                    <M3Button tone="secondary" onClick={loadLive}>Try again</M3Button>
                  </div>
                ) : sections.length === 0 ? (
                  <EmptyState
                    title="Nothing is live yet"
                    hint="Publish a draft and it will appear here and on your public profile."
                    action={<M3Button onClick={() => setTab("compose")}>Write a draft</M3Button>}
                  />
                ) : (
                  <ul className="space-y-2">
                    {sections.map((s) => (
                      <li key={s.id} className="rounded-2xl border border-border-secondary bg-bg-primary p-3">
                        {editingId === s.id ? (
                          <div className="space-y-2">
                            <label htmlFor={`edit-title-${s.id}`} className="block text-sm font-medium text-text-primary">Section title</label>
                            <Input id={`edit-title-${s.id}`} className="min-h-11 text-base" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            <label htmlFor={`edit-body-${s.id}`} className="block text-sm font-medium text-text-primary">Section body</label>
                            <textarea id={`edit-body-${s.id}`} className={`${FIELD_CLS} min-h-28`} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                            <div className="flex flex-wrap items-center gap-2">
                              <M3Button onClick={saveEdit} disabled={busy || !editDirty}>{busy ? "Saving…" : "Save changes"}</M3Button>
                              <M3Button tone="secondary" onClick={cancelEdit}>Cancel</M3Button>
                              {editDirty ? <span role="status" className="text-xs font-semibold text-warning">Unsaved changes</span> : null}
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
                            <div className="flex gap-1 mt-1 -ml-2">
                              <button type="button" onClick={() => startEdit(s)} aria-label={`Edit ${s.title}`} className={LINK_BTN}>Edit</button>
                              <button type="button" onClick={() => unpublish(s)} aria-label={`Remove ${s.title}`} className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-danger transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Remove</button>
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
                    className="w-full h-[520px] bg-bg-primary"
                  />
                </div>
              </M3Card>
            </>
          )}

          {/* ---------- DRAFTS ---------- */}
          {tab === "drafts" && (
            <M3Card title="Drafts" action={<button type="button" onClick={loadDrafts} className={LINK_BTN}>Refresh</button>}>
              {draftsLoading && drafts.length === 0 && !draftsError ? (
                <div className="space-y-2" aria-hidden="true">
                  <Skeleton className="h-16 w-full motion-reduce:animate-none" />
                  <Skeleton className="h-16 w-full motion-reduce:animate-none" />
                </div>
              ) : draftsError ? (
                <div className="space-y-2">
                  <M3State state="error" message={`Couldn't load drafts (${draftsError}).`} />
                  <M3Button tone="secondary" onClick={loadDrafts}>Try again</M3Button>
                </div>
              ) : drafts.length === 0 ? (
                <EmptyState
                  title="No drafts yet"
                  hint="Drafts you generate are saved here so you can pick them up later."
                  action={<M3Button onClick={() => setTab("compose")}>Write a draft</M3Button>}
                />
              ) : (
                <ul className="space-y-2">
                  {drafts.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => openDraft(d)}
                        aria-label={`Open ${d.platform} draft from ${relTime(d.createdAt)}`}
                        className="w-full min-h-11 text-left rounded-2xl border border-border-secondary bg-bg-primary p-3 transition-colors hover:border-border-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-bold uppercase tracking-wide text-accent">{d.platform}</span>
                          <span className="text-2xs text-text-tertiary">{relTime(d.createdAt)}</span>
                        </div>
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{String(d.content ?? "").slice(0, 160)}</p>
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
