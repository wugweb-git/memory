'use client';

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AppToastContainer } from "@/app/component/AppToastContainer";
import "react-toastify/dist/ReactToastify.css";
import { M3Card, M3Page, M3Button, M3State } from "@/components/ui/m3";
import { AppShell } from "@/app/component/AppShell";
import { UI_API } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { IDENTITY_CONFIG } from "@/config/identity";
import Link from "next/link";

type CmsType = "project" | "caseStudy" | "blogPost";
type Doc = {
  _id: string;
  title: string;
  slug?: string;
  summary?: string;
  excerpt?: string;
  client?: string;
  outcome?: string;
  url?: string;
  featured?: boolean;
  tags?: string[];
};
type Managed = { enabled: boolean; project: Doc[]; caseStudy: Doc[]; blogPost: Doc[] };

const TABS: { type: CmsType; label: string }[] = [
  { type: "project", label: "Projects" },
  { type: "caseStudy", label: "Case studies" },
  { type: "blogPost", label: "Blog" },
];

const emptyForm = { title: "", summary: "", excerpt: "", client: "", outcome: "", url: "", tags: "", featured: false };

export default function PortfolioPage() {
  const [tab, setTab] = useState<CmsType>("project");
  const [data, setData] = useState<Managed | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [titleErr, setTitleErr] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiRequest<Managed>(UI_API.cmsContent);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.title.trim()) { setTitleErr(true); toast.error("Title required"); return; }
    setTitleErr(false);
    setSaving(true);
    try {
      await apiRequest(UI_API.cmsContent, { method: "POST", body: { type: tab, ...form } });
      toast.success("Published to your showcase");
      setForm({ ...emptyForm });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally { setSaving(false); }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Remove "${title}" from your public showcase?`)) return;
    try {
      await apiRequest(`${UI_API.cmsContent}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("Removed");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const docs: Doc[] = data ? (data[tab] ?? []) : [];

  return (
    <AppShell>
      <AppToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Portfolio & content" subtitle="Manage the projects, case studies and posts the world sees — synced to your showcase">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.type}
                aria-pressed={tab === t.type}
                onClick={() => { setTab(t.type); setShowForm(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  tab === t.type ? "bg-black text-white" : "border border-border-primary bg-white text-text-secondary"
                }`}
              >
                {t.label}
                {data && data[t.type]?.length ? ` (${data[t.type].length})` : ""}
              </button>
            ))}
          </div>

          <M3Card
            title={TABS.find((t) => t.type === tab)!.label}
            action={
              <div className="flex items-center gap-3">
                <Link href={`/p/${IDENTITY_CONFIG.HANDLE}`} target="_blank" rel="noopener noreferrer" className="text-2xs font-bold uppercase text-accent">View live<span className="sr-only"> (opens in a new tab)</span></Link>
                <button onClick={() => setShowForm((s) => !s)} className="text-2xs font-bold uppercase text-accent">
                  {showForm ? "Close" : "New"}
                </button>
              </div>
            }
          >
            {data && !data.enabled ? (
              <M3State state="error" message="Sanity CMS isn't configured in this environment." />
            ) : loading ? (
              <M3State state="loading" message="Loading your content…" />
            ) : (
              <>
                {showForm && (
                  <div className="space-y-2 rounded-2xl border border-border-secondary bg-bg-secondary p-3 mb-3">
                    <input className="w-full rounded-xl border border-border-primary p-2 text-sm" aria-label="Title" placeholder="Title" required aria-required="true" aria-invalid={titleErr ? true : undefined} aria-describedby={titleErr ? "pf-title-err" : undefined} autoComplete="off" value={form.title} onChange={(e) => { setTitleErr(false); setForm({ ...form, title: e.target.value }); }} />
                    {titleErr && <p id="pf-title-err" role="alert" className="text-xs text-danger">Title is required.</p>}
                    {tab === "blogPost" ? (
                      <textarea className="w-full rounded-xl border border-border-primary p-2 text-sm" aria-label="Excerpt" placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                    ) : (
                      <textarea className="w-full rounded-xl border border-border-primary p-2 text-sm" aria-label="Summary" placeholder="Summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                    )}
                    {tab === "caseStudy" && (
                      <>
                        <input className="w-full rounded-xl border border-border-primary p-2 text-sm" aria-label="Client" placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                        <input className="w-full rounded-xl border border-border-primary p-2 text-sm" aria-label="Outcome" placeholder="Outcome" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
                      </>
                    )}
                    {tab === "project" && (
                      <input className="w-full rounded-xl border border-border-primary p-2 text-sm" aria-label="URL (optional)" placeholder="URL (optional)" type="url" inputMode="url" autoComplete="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                    )}
                    <input className="w-full rounded-xl border border-border-primary p-2 text-sm" aria-label="Tags (comma-separated)" placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                    <M3Button onClick={create} disabled={saving}>{saving ? "Publishing…" : "Publish to showcase"}</M3Button>
                  </div>
                )}

                {docs.length === 0 ? (
                  <M3State state="empty" message={`No ${TABS.find((t) => t.type === tab)!.label.toLowerCase()} yet. Click “New” to add one.`} />
                ) : (
                  <ul className="space-y-2">
                    {docs.map((d) => (
                      <li key={d._id} className="rounded-2xl border border-border-secondary bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text-primary truncate">
                              {d.title}
                              {d.featured ? <span className="ml-2 text-2xs font-bold uppercase text-accent">Featured</span> : null}
                            </p>
                            {(d.summary || d.excerpt || d.client) && (
                              <p className="text-sm text-text-secondary line-clamp-2">{d.summary || d.excerpt || d.client}</p>
                            )}
                            {d.tags?.length ? (
                              <p className="text-2xs text-text-tertiary mt-1">{d.tags.join(" · ")}</p>
                            ) : null}
                          </div>
                          <button onClick={() => remove(d._id, d.title)} className="text-2xs font-bold uppercase text-danger shrink-0">Remove</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </M3Card>

          <p className="text-xs text-text-tertiary">
            Everything here publishes to your Sanity showcase and renders on{" "}
            <Link href={`/p/${IDENTITY_CONFIG.HANDLE}`} target="_blank" className="text-accent underline">/p/{IDENTITY_CONFIG.HANDLE}</Link>.
          </p>
        </M3Page>
      </div>
    </AppShell>
  );
}
