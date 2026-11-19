'use client';

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AppToastContainer } from "@/app/component/AppToastContainer";
import "react-toastify/dist/ReactToastify.css";
import { M3Card, M3Page, M3Button, M3State } from "@/components/ui/m3";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
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

const FIELD_CLS =
  "w-full min-h-11 rounded-xl border border-border-primary bg-bg-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const LINK_BTN =
  "inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-accent transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function Label({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-text-primary">
      {children}
      {optional ? <span className="ml-1 text-xs font-normal text-text-tertiary">Optional</span> : null}
    </label>
  );
}

const emptyForm = { title: "", summary: "", excerpt: "", client: "", outcome: "", url: "", tags: "", featured: false };

export default function PortfolioPage() {
  const [tab, setTab] = useState<CmsType>("project");
  const [data, setData] = useState<Managed | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [titleErr, setTitleErr] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiRequest<Managed>(UI_API.cmsContent);
      setData(res);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not load content");
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.title.trim()) { setTitleErr(true); toast.error("Add a title before publishing"); return; }
    setTitleErr(false);
    if (form.url.trim() && !/^https?:\/\//i.test(form.url.trim())) { toast.error("The URL must start with http:// or https://"); return; }
    setSaving(true);
    try {
      await apiRequest(UI_API.cmsContent, { method: "POST", body: { type: tab, ...form, title: form.title.trim() } });
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
          <div className="flex flex-wrap gap-2" role="group" aria-label="Content type">
            {TABS.map((t) => (
              <button
                key={t.type}
                type="button"
                aria-pressed={tab === t.type}
                onClick={() => { setTab(t.type); setShowForm(false); }}
                className={`min-h-11 px-4 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tab === t.type ? "bg-text-primary text-bg-primary" : "border border-border-primary bg-bg-primary text-text-secondary hover:bg-bg-secondary"
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
              <div className="flex items-center gap-1">
                <Link href={`/p/${IDENTITY_CONFIG.HANDLE}`} target="_blank" rel="noopener noreferrer" className={LINK_BTN}>View live<span className="sr-only"> (opens in a new tab)</span></Link>
                <button type="button" aria-expanded={showForm} onClick={() => setShowForm((s) => !s)} className={LINK_BTN}>
                  {showForm ? "Close form" : "Add new"}
                </button>
              </div>
            }
          >
            {loadError ? (
              <div>
                <M3State state="error" message={`Couldn't load your content (${loadError}).`} />
                <div className="mt-2"><M3Button tone="secondary" onClick={load}>Try again</M3Button></div>
              </div>
            ) : data && !data.enabled ? (
              <EmptyState title="The CMS is not connected here" hint="Add the Sanity project ID and token to this environment, then reload. Your showcase content is safe." />
            ) : loading ? (
              <div className="space-y-2" role="status" aria-label="Loading your content">
                <Skeleton className="h-16 w-full motion-reduce:animate-none" />
                <Skeleton className="h-16 w-full motion-reduce:animate-none" />
              </div>
            ) : (
              <>
                {showForm && (
                  <form
                    noValidate
                    onSubmit={(e) => { e.preventDefault(); create(); }}
                    aria-label={`New ${TABS.find((t) => t.type === tab)!.label.toLowerCase()} entry`}
                    className="space-y-3 rounded-2xl border border-border-secondary bg-bg-secondary p-3 mb-3"
                  >
                    <div>
                      <Label htmlFor="pf-title">Title</Label>
                      <input id="pf-title" className={`${FIELD_CLS} ${titleErr ? "border-danger" : ""}`} required aria-required="true" aria-invalid={titleErr ? true : undefined} aria-describedby={titleErr ? "pf-title-err" : undefined} autoComplete="off" value={form.title} onChange={(e) => { setTitleErr(false); setForm({ ...form, title: e.target.value }); }} />
                      {titleErr && <p id="pf-title-err" role="alert" className="mt-1 text-xs text-danger">Add a title so visitors know what this is.</p>}
                    </div>
                    {tab === "blogPost" ? (
                      <div>
                        <Label htmlFor="pf-excerpt" optional>Excerpt</Label>
                        <textarea id="pf-excerpt" rows={3} className={FIELD_CLS} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="pf-summary" optional>Summary</Label>
                        <textarea id="pf-summary" rows={3} className={FIELD_CLS} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                      </div>
                    )}
                    {tab === "caseStudy" && (
                      <>
                        <div>
                          <Label htmlFor="pf-client" optional>Client</Label>
                          <input id="pf-client" className={FIELD_CLS} value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                        </div>
                        <div>
                          <Label htmlFor="pf-outcome" optional>Outcome</Label>
                          <input id="pf-outcome" className={FIELD_CLS} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
                        </div>
                      </>
                    )}
                    {tab === "project" && (
                      <div>
                        <Label htmlFor="pf-url" optional>Link</Label>
                        <input id="pf-url" className={FIELD_CLS} type="url" inputMode="url" autoComplete="url" placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="pf-tags" optional>Tags</Label>
                      <input id="pf-tags" className={FIELD_CLS} aria-describedby="pf-tags-hint" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                      <p id="pf-tags-hint" className="mt-1 text-xs text-text-tertiary">Separate tags with commas.</p>
                    </div>
                    <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary">
                      <input type="checkbox" className="h-5 w-5 accent-accent" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                      Feature this on your profile
                    </label>
                    <M3Button type="submit" disabled={saving}>{saving ? "Publishing…" : "Publish to showcase"}</M3Button>
                  </form>
                )}

                {docs.length === 0 ? (
                  <EmptyState
                    title={`No ${TABS.find((t) => t.type === tab)!.label.toLowerCase()} yet`}
                    hint="Add one and it appears on your public profile straight away."
                    action={<M3Button onClick={() => setShowForm(true)}>Add the first one</M3Button>}
                  />
                ) : (
                  <ul className="space-y-2">
                    {docs.map((d) => (
                      <li key={d._id} className="rounded-2xl border border-border-secondary bg-bg-primary p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text-primary break-words">
                              {d.title}
                              {d.featured ? <span className="ml-2 text-2xs font-bold text-accent">Featured</span> : null}
                            </p>
                            {(d.summary || d.excerpt || d.client) && (
                              <p className="text-sm text-text-secondary line-clamp-2">{d.summary || d.excerpt || d.client}</p>
                            )}
                            {d.tags?.length ? (
                              <p className="text-2xs text-text-tertiary mt-1">{d.tags.join(", ")}</p>
                            ) : null}
                          </div>
                          <button type="button" onClick={() => remove(d._id, d.title)} aria-label={`Remove ${d.title}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-semibold text-danger transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Remove</button>
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
            <Link href={`/p/${IDENTITY_CONFIG.HANDLE}`} target="_blank" rel="noopener noreferrer" className="text-accent underline">/p/{IDENTITY_CONFIG.HANDLE}<span className="sr-only"> (opens in a new tab)</span></Link>.
          </p>
        </M3Page>
      </div>
    </AppShell>
  );
}
