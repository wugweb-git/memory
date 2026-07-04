'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { M3Button, M3Card, M3Page, M3State } from "@/components/ui/m3";
import { AppShell } from "@/app/component/AppShell";
import { JobPipeline } from "@/app/component/JobPipeline";
import { JobSearchAgent } from "@/app/component/JobSearchAgent";
import { IDENTITY_CONFIG } from "@/config/identity";
import { profilePath } from "@/lib/api/endpoints";
import { apiRequest } from "@/lib/ui/api-client";

type ExperienceSection = {
  id: string;
  type: string;
  title: string;
  content: Record<string, any>;
};

const HANDLE = IDENTITY_CONFIG.HANDLE;

const emptyForm = {
  title: "",
  company: "",
  date: "",
  industries: "",
  originalLogic: "",
  perspective2026: "",
};

function toForm(s: ExperienceSection) {
  const c = s.content ?? {};
  return {
    title: s.title,
    company: String(c.company ?? ""),
    date: String(c.date ?? ""),
    industries: Array.isArray(c.industries) ? c.industries.join(", ") : String(c.industry ?? ""),
    originalLogic: String(c.originalLogic ?? c.logic ?? ""),
    perspective2026: String(c.perspective2026 ?? c.perspective ?? ""),
  };
}

export default function CareerPage() {
  const [sections, setSections] = useState<ExperienceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ sections?: ExperienceSection[] }>(profilePath(HANDLE, "sections"));
      setSections((res.sections ?? []).filter((s) => s.type === "experience"));
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function startEdit(s: ExperienceSection) {
    setEditingId(s.id);
    setForm(toForm(s));
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Role title required"); return; }
    setSaving(true);
    const content = {
      company: form.company.trim(),
      date: form.date.trim(),
      industries: form.industries.split(",").map((i) => i.trim()).filter(Boolean),
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
      toast.success("Career tree updated — live on your profile");
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: ExperienceSection) {
    if (!confirm(`Remove "${s.title}" from your career tree?`)) return;
    try {
      await apiRequest(`${profilePath(HANDLE, "sections")}?sectionId=${encodeURIComponent(s.id)}`, { method: "DELETE" });
      toast.success("Removed");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  }

  return (
    <AppShell>
      <ToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Career" subtitle="Your career tree, applications and opportunities — the tree feeds your public profile">
          <M3Card
            title="Career tree"
            action={
              <div className="flex items-center gap-3">
                <Link href={`/p/${HANDLE}`} target="_blank" className="text-2xs font-bold uppercase text-accent">View live</Link>
                <button onClick={showForm ? () => setShowForm(false) : startNew} className="text-2xs font-bold uppercase text-accent">
                  {showForm ? "Close" : "Add role"}
                </button>
              </div>
            }
          >
            {showForm && (
              <div className="space-y-2 rounded-2xl border border-border-secondary bg-bg-secondary p-3 mb-3">
                <input className="w-full rounded-xl border border-border-primary p-2 text-sm" placeholder="Role title (e.g. Founder & Systems Architect)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="rounded-xl border border-border-primary p-2 text-sm" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  <input className="rounded-xl border border-border-primary p-2 text-sm" placeholder="Dates (e.g. 2020 — Present)" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <input className="w-full rounded-xl border border-border-primary p-2 text-sm" placeholder="Industries (comma-separated)" value={form.industries} onChange={(e) => setForm({ ...form, industries: e.target.value })} />
                <textarea className="w-full rounded-xl border border-border-primary p-2 text-sm" placeholder="What you did — the original logic" value={form.originalLogic} onChange={(e) => setForm({ ...form, originalLogic: e.target.value })} />
                <textarea className="w-full rounded-xl border border-border-primary p-2 text-sm" placeholder="What it means now — today's perspective" value={form.perspective2026} onChange={(e) => setForm({ ...form, perspective2026: e.target.value })} />
                <M3Button onClick={save} disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add to career tree"}</M3Button>
              </div>
            )}

            {loading ? (
              <M3State state="loading" message="Loading your career tree…" />
            ) : sections.length === 0 ? (
              <M3State state="empty" message="No roles yet. Add your first — it renders on your public profile." />
            ) : (
              <ol className="relative border-l border-border-secondary ml-1.5 space-y-4">
                {sections.map((s) => {
                  const c = s.content ?? {};
                  return (
                    <li key={s.id} className="ml-5">
                      <span className="absolute -left-[5.5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent border-2 border-white" />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-sm font-bold text-text-primary">{s.title}</p>
                        <span className="text-2xs text-text-disabled">{String(c.date ?? "")}</span>
                      </div>
                      {c.company ? <p className="text-xs text-text-tertiary">{String(c.company)}</p> : null}
                      {c.originalLogic ? <p className="text-sm text-text-secondary mt-1 line-clamp-2">{String(c.originalLogic)}</p> : null}
                      <div className="flex gap-3 mt-1.5">
                        <button onClick={() => startEdit(s)} className="text-2xs font-bold uppercase text-accent">Edit</button>
                        <button onClick={() => remove(s)} className="text-2xs font-bold uppercase text-danger">Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </M3Card>

          {/* Job pipeline + opportunities (component library, L0-backed) */}
          <JobPipeline />
          <JobSearchAgent />
        </M3Page>
      </div>
    </AppShell>
  );
}
