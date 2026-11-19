'use client';

import { useEffect, useId, useState } from "react";
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

const emptyForm = { title: "", summary: "", excerpt: "", client: "", outcome: "", url: "", tags: "", featured: false };

const inputCls =
  "w-full min-h-[44px] rounded-xl border bg-bg-elevated px-3 py-2 text-base sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const linkBtnCls =
  "inline-flex items-center min-h-[44px] px-2 text-sm font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {optional ? <span className="ml-1 text-2xs font-normal text-text-tertiary">Optional</span> : null}
      </label>
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export default function PortfolioPage() {
  const uid = useId();
  const [tab, setTab] = useState<CmsType>("project");
  const [data, setData] = useState<Managed | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [titleErr, setTitleErr] = useState("");
  const [urlErr, setUrlErr] = useState("");

  const id = (k: string) => `${uid}-${k}`;

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiRequest<Managed>(UI_API.cmsContent);
      setData(res);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "The content service did not respond.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setTitleErr("");
    setUrlErr("");
    if (!form.title.trim()) { setTitleErr("Enter a title."); document.getElementById(id("title"))?.focus(); return; }
    if (form.url.trim() && !/^https?:\/\//i.test(form.url.trim())) { setUrlErr("Start the URL with http:// or https://."); document.getElementById(id("url"))?.focus(); return; }
    setSaving(true);
    try {
      await apiRequest(UI_API.cmsContent, { method: "POST", body: { type: tab, ...form, title: form.title.trim() } });
      toast.success("Published to your showcase");
      setForm({ ...emptyForm });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not publish. Check your connection and try again.");
    } finally { setSaving(false); }
  }

  async function remove(docId: string, title: string) {
    if (!confirm(`Remove "${title}" from your public showcase? This cannot be undone.`)) return;
    try {
      await apiRequest(`${UI_API.cmsContent}?id=${encodeURIComponent(docId)}`, { method: "DELETE" });
      toast.success("Removed from your showcase");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not remove this item. Try again.");
    }
  }

  const docs: Doc[] = data ? (data[tab] ?? []) : [];
  const tabLabel = TABS.find((t) => t.type === tab)!.label;

  return (
    <AppShell>
      <AppToastContainer position="bottom-right" theme="light" />
      <M3Page title="Portfolio and content" subtitle="Manage the projects, case studies and posts visitors see, synced to your showcase">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Content type">
          {TABS.map((t) => (
            <button
              key={t.type}
              type="button"
              aria-pressed={tab === t.type}
              onClick={() => { setTab(t.type); setShowForm(false); setTitleErr(""); setUrlErr(""); }}
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
          title={tabLabel}
          action={
            <div className="flex items-center gap-1">
              <Link href={`/p/${IDENTITY_CONFIG.HANDLE}`} target="_blank" rel="noopener noreferrer" className={`${linkBtnCls} text-accent`}>View live<span className="sr-only"> (opens in a new tab)</span></Link>
              <button type="button" aria-expanded={showForm} onClick={() => setShowForm((s) => !s)} className={`${linkBtnCls} text-accent`}>
                {showForm ? "Close form" : `Add to ${tabLabel.toLowerCase()}`}
              </button>
            </div>
          }
        >
          {loadError ? (
            <div>
              <M3State state="error" message={`Could not load your content: ${loadError}`} />
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
                  aria-label={`Add to ${tabLabel.toLowerCase()}`}
                  onSubmit={(e) => { e.preventDefault(); create(); }}
                  className="space-y-3 rounded-2xl border border-border-secondary bg-bg-secondary p-4 mb-3"
                >
                  <Field id={id("title")} label="Title" error={titleErr}>
                    <input
                      id={id("title")} required aria-required="true" autoComplete="off"
                      aria-invalid={titleErr ? true : undefined}
                      aria-describedby={titleErr ? `${id("title")}-err` : undefined}
                      className={`${inputCls} ${titleErr ? "border-danger" : "border-border-primary"}`}
                      value={form.title} onChange={(e) => { setTitleErr(""); setForm({ ...form, title: e.target.value }); }}
                    />
                  </Field>
                  {tab === "blogPost" ? (
                    <Field id={id("excerpt")} label="Excerpt" optional>
                      <textarea id={id("excerpt")} rows={3} className={`${inputCls} border-border-primary`} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                    </Field>
                  ) : (
                    <Field id={id("summary")} label="Summary" optional>
                      <textarea id={id("summary")} rows={3} className={`${inputCls} border-border-primary`} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                    </Field>
                  )}
                  {tab === "caseStudy" && (
                    <>
                      <Field id={id("client")} label="Client" optional>
                        <input id={id("client")} autoComplete="organization" className={`${inputCls} border-border-primary`} value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                      </Field>
                      <Field id={id("outcome")} label="Outcome" optional>
                        <input id={id("outcome")} autoComplete="off" className={`${inputCls} border-border-primary`} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
                      </Field>
                    </>
                  )}
                  {tab === "project" && (
                    <Field id={id("url")} label="Project URL" optional error={urlErr}>
                      <input
                        id={id("url")} type="url" inputMode="url" autoComplete="url" placeholder="https://"
                        aria-invalid={urlErr ? true : undefined}
                        aria-describedby={urlErr ? `${id("url")}-err` : undefined}
                        className={`${inputCls} ${urlErr ? "border-danger" : "border-border-primary"}`}
                        value={form.url} onChange={(e) => { setUrlErr(""); setForm({ ...form, url: e.target.value }); }}
                      />
                    </Field>
                  )}
                  <Field id={id("tags")} label="Tags" optional>
                    <input id={id("tags")} autoComplete="off" aria-describedby={`${id("tags")}-hint`} className={`${inputCls} border-border-primary`} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                    <p id={`${id("tags")}-hint`} className="mt-1 text-xs text-text-tertiary">Separate tags with commas.</p>
                  </Field>
                  <label className="flex items-center gap-3 min-h-11 text-sm text-text-secondary">
                    <input type="checkbox" className="h-5 w-5 accent-accent" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                    Feature this on your profile
                  </label>
                  <M3Button type="submit" disabled={saving}>{saving ? "Publishing…" : "Publish to showcase"}</M3Button>
                </form>
              )}

              {docs.length === 0 ? (
                <EmptyState
                  title={`No ${tabLabel.toLowerCase()} yet`}
                  hint="Add one and it appears on your public profile straight away."
                  action={<M3Button onClick={() => setShowForm(true)}>Add the first one</M3Button>}
                />
              ) : (
                <ul className="space-y-2">
                  {docs.map((d) => (
                    <li key={d._id} className="rounded-2xl border border-border-secondary bg-bg-primary p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary break-words">
                            {d.title}
                            {d.featured ? <span className="ml-2 text-xs font-medium text-accent">Featured</span> : null}
                          </p>
                          {(d.summary || d.excerpt || d.client) && (
                            <p className="text-sm text-text-secondary line-clamp-2">{d.summary || d.excerpt || d.client}</p>
                          )}
                          {d.tags?.length ? (
                            <p className="text-xs text-text-tertiary mt-1">{d.tags.join(", ")}</p>
                          ) : null}
                        </div>
                        <button type="button" onClick={() => remove(d._id, d.title)} aria-label={`Remove ${d.title}`} className={`${linkBtnCls} text-danger shrink-0`}>Remove</button>
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
    </AppShell>
  );
}
