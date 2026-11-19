'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { AppToastContainer } from "@/app/component/AppToastContainer";
import "react-toastify/dist/ReactToastify.css";
import { M3Button, M3Card, M3Page, M3State } from "@/components/ui/m3";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AppShell } from "@/app/component/AppShell";
import { JobPipeline } from "@/app/component/JobPipeline";
import { JobSearchAgent } from "@/app/component/JobSearchAgent";
import { IDENTITY_CONFIG } from "@/config/identity";
import { profilePath } from "@/lib/api/endpoints";
import { apiRequest, ApiClientError } from "@/lib/ui/api-client";
import { RoleForm, emptyRoleForm, type RoleFormValues, type SaveState } from "./RoleForm";

type ExperienceSection = {
  id: string;
  type: string;
  title: string;
  content: Record<string, any>;
};

const HANDLE = IDENTITY_CONFIG.HANDLE;

function friendlyError(e: unknown, fallback: string): string {
  if (e instanceof ApiClientError && e.status === 401) return "Your session has ended. Sign in again, then retry.";
  return e instanceof Error && e.message ? e.message : fallback;
}

function toForm(s: ExperienceSection): RoleFormValues {
  const c = s.content ?? {};
  return {
    title: s.title,
    company: String(c.company ?? ""),
    date: String(c.date ?? ""),
    industries: Array.isArray(c.industries) ? c.industries : (c.industry ? [String(c.industry)] : []),
    originalLogic: String(c.originalLogic ?? c.logic ?? ""),
    perspective2026: String(c.perspective2026 ?? c.perspective ?? ""),
  };
}

export default function CareerPage() {
  const [sections, setSections] = useState<ExperienceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormValues>({ ...emptyRoleForm });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await apiRequest<{ sections?: ExperienceSection[] }>(profilePath(HANDLE, "sections"));
      setSections((res.sections ?? []).filter((s) => s.type === "experience"));
    } catch {
      setLoadFailed(true);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setEditingId(null);
    setForm({ ...emptyRoleForm });
    setSaveState("idle");
    setShowForm(true);
  }

  function startEdit(s: ExperienceSection) {
    setEditingId(s.id);
    setForm(toForm(s));
    setSaveState("idle");
    setShowForm(true);
  }

  async function save() {
    setSaveState("saving");
    setSaveError("");
    const content = {
      company: form.company.trim(),
      date: form.date.trim(),
      industries: form.industries,
      originalLogic: form.originalLogic.trim(),
      perspective2026: form.perspective2026.trim(),
    };
    try {
      if (editingId) {
        await apiRequest(profilePath(HANDLE, "sections"), {
          method: "PATCH",
          body: { sectionId: editingId, title: form.title.trim(), content },
        });
      } else {
        await apiRequest(profilePath(HANDLE, "sections"), {
          method: "POST",
          body: { type: "experience", title: form.title.trim(), content },
        });
      }
      setSaveState("saved");
      toast.success("Career tree updated. It is live on your profile.");
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      setSaveState("failed");
      setSaveError(friendlyError(e, "Could not save. Try again."));
    }
  }

  async function remove(s: ExperienceSection) {
    if (!confirm(`Remove "${s.title}" from your career tree?`)) return;
    try {
      await apiRequest(`${profilePath(HANDLE, "sections")}?sectionId=${encodeURIComponent(s.id)}`, { method: "DELETE" });
      toast.success("Role removed from your career tree");
      await load();
    } catch (e: unknown) {
      toast.error(friendlyError(e, "Could not remove this role. Try again."));
    }
  }

  return (
    <AppShell>
      <AppToastContainer position="top-center" theme="light" />
      <M3Page title="Career" subtitle="Your career tree, applications and opportunities. The tree feeds your public profile.">
          <M3Card
            title="Career tree"
            action={
              <div className="flex items-center gap-3">
                <Link href={`/p/${HANDLE}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] px-2 text-sm font-medium hover:bg-bg-secondary active:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg text-accent-ink underline underline-offset-4">View live<span className="sr-only"> (opens in a new tab)</span></Link>
                <button type="button" aria-expanded={showForm} onClick={showForm ? () => setShowForm(false) : startNew} className="min-h-[44px] px-2 text-sm font-medium hover:bg-bg-secondary active:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg text-accent-ink underline underline-offset-4">
                  {showForm ? "Close form" : "Add role"}
                </button>
              </div>
            }
          >
            {showForm && (
              <RoleForm
                values={form}
                onChange={(v) => { setForm(v); if (saveState !== "saving") setSaveState("idle"); }}
                onSubmit={save}
                onCancel={() => { setShowForm(false); setEditingId(null); setSaveState("idle"); }}
                saveState={saveState}
                isEditing={!!editingId}
                errorMessage={saveError}
              />
            )}

            {loading ? (
              <div className="space-y-3" role="status" aria-label="Loading your career tree">
                <Skeleton className="h-14 w-full motion-reduce:animate-none" />
                <Skeleton className="h-14 w-full motion-reduce:animate-none" />
              </div>
            ) : loadFailed ? (
              <div>
                <M3State state="error" message="Could not load your career tree. Check your connection, then try again." />
                <button type="button" onClick={load} className="mt-2 min-h-[44px] px-3 rounded-xl border border-border-primary text-sm font-medium text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">Try again</button>
              </div>
            ) : sections.length === 0 ? (
              <EmptyState
                title="No roles yet"
                hint="Add your first role and it appears on your public profile."
                action={<M3Button onClick={startNew}>Add your first role</M3Button>}
              />
            ) : (
              <ol className="relative border-l border-border-secondary ml-1.5 space-y-4">
                {sections.map((s) => {
                  const c = s.content ?? {};
                  return (
                    <li key={s.id} className="ml-5">
                      <span aria-hidden="true" className="absolute -left-[5.5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent border-2 border-bg-elevated" />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-base font-semibold text-text-primary">{s.title}</p>
                        {c.date ? <span className="text-xs text-text-tertiary">{String(c.date)}</span> : null}
                      </div>
                      {c.company ? <p className="text-sm text-text-tertiary">{String(c.company)}</p> : null}
                      {c.originalLogic ? <p className="text-sm text-text-secondary mt-1 line-clamp-2">{String(c.originalLogic)}</p> : null}
                      <div className="flex gap-1 mt-1 -ml-2">
                        <button type="button" onClick={() => startEdit(s)} aria-label={`Edit ${s.title}`} className="min-h-[44px] min-w-[44px] px-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg text-accent-ink underline underline-offset-4">Edit</button>
                        <button type="button" onClick={() => remove(s)} aria-label={`Remove ${s.title}`} className="min-h-[44px] px-2 text-sm font-medium hover:bg-bg-secondary active:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg text-danger">Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </M3Card>

          {/* Job pipeline + opportunities — visually separated from the career
              tree above since these are two different tools sharing a page. */}
          <div className="pt-2 mt-2 border-t border-border-secondary">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 px-1">Job search</p>
            <div className="space-y-4">
              <JobPipeline />
              <JobSearchAgent />
            </div>
          </div>
      </M3Page>
    </AppShell>
  );
}
