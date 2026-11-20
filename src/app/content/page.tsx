'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AppToastContainer } from "@/app/component/AppToastContainer";
import "react-toastify/dist/ReactToastify.css";
import { M3Button, M3Card, M3Page, M3State } from "@/components/ui/m3";
import { EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UI_API, resolveUserId } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { AppShell } from "@/app/component/AppShell";
import { OUTPUT_PLATFORMS } from "@/config/ui-content";
import { IDENTITY_CONFIG } from "@/config/identity";
import { profilePath } from "@/lib/api/endpoints";
import Link from "next/link";
import { ManualPostCard, type ManualPrep } from "./ManualPostCard";
import { isManualPlatform, manualPostText } from "@/lib/platforms/manual";

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
  "w-full min-h-12 rounded-xl border border-border-primary bg-bg-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";
const LINK_BTN =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-accent-ink transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const LEAVE_MESSAGE = "You have unsaved changes to this draft. Discard them?";

function platformLabel(value: string) {
  return OUTPUT_PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

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
            <p className="text-sm font-semibold text-text-primary">{HANDLE}</p>
            <p className="text-xs text-text-secondary">LinkedIn, preview</p>
          </div>
        </div>
        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
          {segs.map((seg, i) =>
            seg.trim().startsWith("#") ? <span key={i} className="text-accent-ink">{seg}</span> : <span key={i}>{seg}</span>,
          )}
        </p>
      </div>
    );
  }
  if (platform === "memo") {
    return (
      <div className="rounded-2xl border border-border-secondary bg-bg-secondary p-4">
        <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
      </div>
    );
  }
  return (
    <article className="rounded-2xl border border-border-secondary bg-bg-secondary p-5">
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{body || content}</p>
    </article>
  );
}

/** Guided path: pick a decision, edit the draft, publish. One current step at a time. */
function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Pick a decision", "Edit the draft", "Publish"];
  return (
    <div aria-label="Progress" role="group" className="space-y-2">
      <p className="text-sm font-medium text-text-primary">
        Step {step} of {steps.length}: <span className="text-text-secondary">{steps[step - 1]}</span>
      </p>
      <ol className="grid grid-cols-3 gap-1.5">
        {steps.map((label, i) => {
          const n = i + 1;
          return (
            <li
              key={label}
              aria-current={n === step ? "step" : undefined}
              className={`h-1.5 rounded-full ${n < step ? "bg-success" : n === step ? "bg-text-primary" : "bg-border-primary"}`}
            >
              <span className="sr-only">{`${label}${n < step ? " (done)" : n === step ? " (current step)" : ""}`}</span>
            </li>
          );
        })}
      </ol>
    </div>
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
  const [manualPrep, setManualPrep] = useState<ManualPrep | null>(null);
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

  /** One styled confirmation for destructive actions (replaces window.confirm). */
  const [confirmReq, setConfirmReq] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    run: () => void;
  } | null>(null);

  /** Runs `run` now when the draft is clean, otherwise after the user confirms discarding it. */
  function guardDraft(run: () => void) {
    if (!dirty) { run(); return; }
    setConfirmReq({ title: "Discard unsaved changes?", description: LEAVE_MESSAGE, confirmLabel: "Discard changes", cancelLabel: "Keep editing", run });
  }

  const loadDrafts = useCallback(async () => {
    setDraftsError(null);
    setDraftsLoading(true);
    try {
      const rows = await apiRequest<Draft[]>(UI_API.outputDrafts);
      setDrafts(Array.isArray(rows) ? rows : []);
    } catch (e: unknown) {
      setDraftsError(e instanceof Error ? e.message : "The drafts service did not respond.");
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
      setLiveError(e instanceof Error ? e.message : "The profile service did not respond.");
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

  async function generate(skipGuard = false) {
    if (!decisionId) { toast.error("Choose a decision first. Pick a recent one or paste its ID."); return; }
    if (!skipGuard && dirty) { guardDraft(() => void generate(true)); return; }
    try {
      setLoading(true); setError(null);
      const json = await apiRequest<{ output_id?: string; content?: string }>(UI_API.outputGenerate, {
        method: "POST",
        body: { userId, decisionId, sourceContent: content || "Generate output", platform },
        timeoutMs: 30000,
        retries: 0,
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
      const msg = e instanceof Error ? e.message : "Could not generate a draft. Try again in a moment.";
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }

  /** Persist textarea edits so publish and queue act on what the user sees. */
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
      toast.error(e instanceof Error ? e.message : "Could not save the draft. Try again.");
    } finally { setBusy(false); }
  }

  async function addToQueue() {
    if (!outputId) { toast.error("Generate or open a draft first"); return; }
    try {
      setBusy(true);
      await persistEdits();
      await apiRequest(UI_API.outputSchedule, { method: "POST", body: { outputId, platform, userId }, retries: 0 });
      toast.success("Added to the publishing queue");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not add to the queue. Try again.");
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!outputId) { toast.error("Generate or open a draft first"); return; }
    try {
      setBusy(true);
      await persistEdits();
      const res = await apiRequest<{
        sanitySynced?: boolean;
        payload?: unknown;
        delivery?: { status?: string; ok?: boolean; error?: string | null };
      }>(UI_API.outputPublish, {
        method: "POST", body: { outputId, userId }, retries: 0,
      });
      if (isManualPlatform(platform)) {
        // Nothing was sent to the platform. Show the text for the owner to post by hand.
        setManualPrep({ outputId, platform, text: manualPostText(platform, res?.payload) || content });
        toast.success("Ready to post. Copy the text and post it yourself");
        setOutputId(null); setContent(""); setSavedContent(""); setVersions([]); setLastSaved(null);
        loadDrafts();
        return;
      }
      const sendFailed = res?.delivery && res.delivery.ok === false;
      if (sendFailed) {
        const why = res?.delivery?.status === "not_configured" ? "its account is not set up yet" : "the platform did not accept it";
        toast.warning(`Published to your profile, but not sent to ${platformLabel(platform)}: ${why}. See History.`);
      } else {
        toast.success(res?.sanitySynced ? "Published to your profile and CMS" : "Published to your profile");
      }
      setOutputId(null); setContent(""); setSavedContent(""); setVersions([]); setLastSaved(null);
      loadDrafts();
      await loadLive();
      setTab("live");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not publish. Your draft is still here; try again.");
    } finally { setBusy(false); }
  }

  function openDraft(d: Draft, skipGuard = false) {
    if (!skipGuard && dirty) { guardDraft(() => openDraft(d, true)); return; }
    setOutputId(d.id); setContent(d.content); setSavedContent(d.content); setPlatform(d.platform);
    if (d.decisionId) setDecisionId(d.decisionId);
    setVersions([]); setLastSaved(null); setTab("compose");
  }

  function startEdit(s: ProfileSection, skipGuard = false) {
    if (!skipGuard && editDirty && editingId !== s.id) {
      setConfirmReq({ title: "Discard section changes?", description: "Your changes to the section you are editing will be lost.", confirmLabel: "Discard changes", cancelLabel: "Keep editing", run: () => startEdit(s, true) });
      return;
    }
    const body = sectionBody(s);
    setEditingId(s.id); setEditTitle(s.title); setEditBody(body);
    setEditOriginal({ title: s.title, body });
  }
  function cancelEdit() {
    if (editDirty) {
      setConfirmReq({ title: "Discard section changes?", description: "Your edits to this section will be lost.", confirmLabel: "Discard changes", cancelLabel: "Keep editing", run: () => setEditingId(null) });
      return;
    }
    setEditingId(null);
  }
  async function saveEdit() {
    if (!editingId) return;
    if (!editTitle.trim()) { toast.error("Enter a title before saving."); return; }
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
      toast.error(e instanceof Error ? e.message : "Could not update the section. Try again.");
    } finally { setBusy(false); }
  }
  function askUnpublish(s: ProfileSection) {
    setConfirmReq({
      title: "Remove from your public profile?",
      description: `"${s.title}" will be removed from your public profile. This cannot be undone.`,
      confirmLabel: "Remove section",
      cancelLabel: "Keep section",
      run: () => void unpublish(s),
    });
  }
  async function unpublish(s: ProfileSection) {
    try {
      setBusy(true);
      await apiRequest(`${profilePath(HANDLE, "sections")}?sectionId=${encodeURIComponent(s.id)}`, { method: "DELETE" });
      toast.success("Removed from profile");
      await loadLive();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not remove the section. Try again.");
    } finally { setBusy(false); }
  }

  const words = useMemo(() => wordCount(content), [content]);

  const tabs: [Tab, string][] = [
    ["compose", "Compose"],
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
        <M3Page title="Output studio" subtitle="Write a draft from a decision, review it, then publish it to your public profile">
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Output studio sections">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                type="button"
                onClick={() => setTab(id)}
                className={`min-h-12 px-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tab === id ? "bg-text-primary text-bg-primary" : "border border-border-primary bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                {label}
                {id === "compose" && dirty ? (
                  <>
                    <span aria-hidden="true" className="ml-1.5 inline-block h-2 w-2 rounded-full bg-warning align-middle" />
                    <span className="sr-only"> (unsaved changes)</span>
                  </>
                ) : null}
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
                    <p id="compose-decision-hint" className="text-sm text-text-secondary">
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
                    <M3Button tone="secondary" onClick={() => generate()} disabled={loading || !decisionId}>
                      {loading ? "Generating…" : "Regenerate draft"}
                    </M3Button>
                  ) : (
                    <M3Button onClick={() => generate()} disabled={loading || !decisionId}>
                      {loading ? "Generating…" : "Generate draft"}
                    </M3Button>
                  )}
                  {loading ? <p role="status" className="text-sm text-text-secondary">This can take up to 30 seconds.</p> : null}
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

              {manualPrep && (
                <ManualPostCard
                  key={manualPrep.outputId}
                  prep={manualPrep}
                  onDone={(message) => { toast.success(message); setManualPrep(null); void loadLive(); }}
                />
              )}

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
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
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
                      <p className="text-sm text-text-secondary">
                        {outputId
                          ? isManualPlatform(platform)
                            ? "3. Prepare to post gets the text ready to copy. You post it yourself, then mark it as posted. Your edits are saved first."
                            : "3. Publish puts this draft on your public profile. Your edits are saved first."
                          : "Generate or open a draft to publish it."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <M3Button onClick={publish} disabled={busy || !outputId}>
                          {busy ? "Working…" : isManualPlatform(platform) ? "Prepare to post" : "Publish to profile"}
                        </M3Button>
                        <M3Button tone="secondary" onClick={saveDraft} disabled={busy || !outputId || !dirty}>
                          Save draft
                        </M3Button>
                        <M3Button tone="secondary" onClick={addToQueue} disabled={busy || !outputId}>
                          Add to queue
                        </M3Button>
                      </div>
                    </div>
                  </M3Card>

                  {showPreview && (
                    <M3Card title={`${platformLabel(platform)} preview`}>
                      <PlatformPreview platform={platform} content={content} />
                    </M3Card>
                  )}

                  {versions.length > 0 && (
                    <M3Card title="Version history">
                      <ul className="space-y-1">
                        {versions.map((v) => (
                          <li key={v.ts} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-text-secondary truncate">
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
                    <Link href={`/p/${HANDLE}`} target="_blank" rel="noopener noreferrer" className={LINK_BTN}>Open profile<span className="sr-only"> (opens in a new tab)</span></Link>
                    <button type="button" onClick={loadLive} className={LINK_BTN}>Refresh</button>
                  </div>
                }
              >
                <p className="text-sm text-text-secondary">
                  This is what visitors see at{" "}
                  <Link href={`/p/${HANDLE}`} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-2">/p/{HANDLE}<span className="sr-only"> (opens in a new tab)</span></Link>. Edit or remove sections here.
                </p>
                {liveLoading && sections.length === 0 && !liveError ? (
                  <div className="space-y-2" aria-hidden="true">
                    <Skeleton className="h-20 w-full motion-reduce:animate-none" />
                    <Skeleton className="h-20 w-full motion-reduce:animate-none" />
                  </div>
                ) : liveError ? (
                  <div className="space-y-2">
                    <M3State state="error" message={`Could not load your profile: ${liveError}`} />
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
                            <Input id={`edit-title-${s.id}`} required aria-required="true" autoComplete="off" className="min-h-11 text-base" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            <label htmlFor={`edit-body-${s.id}`} className="block text-sm font-medium text-text-primary">Section body</label>
                            <textarea id={`edit-body-${s.id}`} className={`${FIELD_CLS} min-h-28`} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                            <div className="flex flex-wrap items-center gap-2">
                              <M3Button onClick={saveEdit} disabled={busy || !editDirty}>{busy ? "Saving…" : "Save changes"}</M3Button>
                              <M3Button tone="secondary" onClick={cancelEdit}>Cancel</M3Button>
                              {editDirty ? <span role="status" className="text-sm font-semibold text-warning">Unsaved changes</span> : null}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-success">{s.type}</span>
                              <span className="text-sm text-text-secondary">{relTime(s.updatedAt ?? s.createdAt)}</span>
                            </div>
                            <p className="text-base font-medium text-text-primary mt-1">{s.title}</p>
                            <p className="text-base text-text-secondary line-clamp-2">{sectionBody(s).slice(0, 180)}</p>
                            <div className="flex gap-1 mt-1 -ml-3">
                              <button type="button" onClick={() => startEdit(s)} aria-label={`Edit ${s.title}`} className={LINK_BTN}>Edit</button>
                              <button type="button" onClick={() => askUnpublish(s)} disabled={busy} aria-label={`Remove ${s.title}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-danger transition-colors hover:bg-bg-tertiary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Remove</button>
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
                    loading="lazy"
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
                  <M3State state="error" message={`Could not load drafts: ${draftsError}`} />
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
                        aria-label={`Open ${platformLabel(d.platform)} draft from ${relTime(d.createdAt)}`}
                        className="w-full min-h-16 text-left rounded-2xl border border-border-secondary bg-bg-primary p-3 transition-colors hover:border-border-primary hover:bg-bg-secondary active:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-accent-ink">{platformLabel(d.platform)}</span>
                          <span className="text-sm text-text-secondary">{relTime(d.createdAt)}</span>
                        </div>
                        <p className="text-base text-text-secondary mt-1 line-clamp-2">{String(d.content ?? "").slice(0, 160)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </M3Card>
          )}
        </M3Page>
      <ConfirmDialog
        open={confirmReq !== null}
        title={confirmReq?.title ?? ""}
        description={confirmReq?.description ?? ""}
        confirmLabel={confirmReq?.confirmLabel ?? "Confirm"}
        cancelLabel={confirmReq?.cancelLabel}
        tone="danger"
        onConfirm={() => {
          const req = confirmReq;
          setConfirmReq(null);
          req?.run();
        }}
        onCancel={() => setConfirmReq(null)}
      />
    </AppShell>
  );
}
