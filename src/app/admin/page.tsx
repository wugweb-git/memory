'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { AppToastContainer } from "@/app/component/AppToastContainer";
import 'react-toastify/dist/ReactToastify.css';
import { ChevronRight } from 'lucide-react';
import { M3Button, M3Page, M3State } from '@/components/ui/m3';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AdminChecklistItem } from '@/lib/admin/checklist';
import { Card, ListGroup, ListRow, Section } from '@/components/ui/primitives';

type HealthRow = { name: string; status: string; ok: boolean };

const HEALTH_ENDPOINTS: Array<{ name: string; path: string }> = [
  { name: 'System', path: API_ENDPOINTS.admin.systemHealth.path },
  { name: 'Models', path: API_ENDPOINTS.admin.modelHealth.path },
  { name: 'Persona', path: API_ENDPOINTS.admin.personaHealth.path },
  { name: 'Output', path: API_ENDPOINTS.admin.outputHealth.path },
  { name: 'Publishing', path: API_ENDPOINTS.admin.publishingHealth.path },
  { name: 'Provenance', path: API_ENDPOINTS.admin.provenanceHealth.path },
  { name: 'Recommendation', path: API_ENDPOINTS.admin.recommendationHealth.path },
];

const SHORTCUTS = [
  { href: '/system', label: 'Module switches', desc: 'Enable or disable app modules' },
  { href: '/admin/memory', label: 'Memory admin', desc: 'Packet-level inspection' },
  { href: '/admin/memory/public', label: 'Public notes', desc: 'Choose what Ask may quote' },
  { href: '/admin/profile', label: 'Profile admin', desc: 'Public profile internals' },
  { href: '/buffer', label: 'Buffer', desc: 'Review and capture incoming items' },
];

export default function AdminConsole() {
  const [health, setHealth] = useState<HealthRow[] | null>(null);
  const [checklist, setChecklist] = useState<AdminChecklistItem[] | null>(null);
  const [checklistError, setChecklistError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [opResult, setOpResult] = useState<{ title: string; body: string } | null>(null);

  const loadHealth = useCallback(async () => {
    const rows = await Promise.all(
      HEALTH_ENDPOINTS.map(async ({ name, path }): Promise<HealthRow> => {
        try {
          const res = await fetch(path, { credentials: 'include' });
          const j = await res.json().catch(() => ({}));
          const status = String(j.status ?? (res.ok ? 'ok' : `HTTP ${res.status}`));
          return { name, status, ok: res.ok && !/broken|fail|error/i.test(status) };
        } catch {
          return { name, status: 'unreachable', ok: false };
        }
      }),
    );
    setHealth(rows);
  }, []);

  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.admin.checklist.path, { credentials: 'include' });
      if (!res.ok) throw new Error(String(res.status));
      // GET /api/admin/checklist returns { items: [...] }, not a bare array.
      // Storing the raw body here made `checklist` an object; every later
      // `checklist.map(...)` / `checklist.filter(...)` in this component then
      // threw "checklist.map is not a function" -- a pure client-side crash
      // that never touches a server log, which is why it never showed up in
      // Vercel's runtime error data. Confirmed by reading the route handler
      // directly (src/app/api/admin/checklist/route.ts).
      const body = await res.json();
      const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
      setChecklist(items);
      setChecklistError(false);
    } catch {
      setChecklist(null);
      setChecklistError(true);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadChecklist();
  }, [loadHealth, loadChecklist]);

  async function runOp(key: string, title: string, fn: () => Promise<string>) {
    setBusy(key);
    setOpResult(null);
    try {
      const body = await fn();
      setOpResult({ title, body });
      toast.success(`${title} finished`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : `${title} failed`;
      setOpResult({ title: `${title} failed`, body: msg });
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  const runDiagnostics = () =>
    runOp('diagnose', 'Diagnostics', async () => {
      const res = await fetch(API_ENDPOINTS.admin.diagnose.path, { method: 'POST', credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `diagnostics failed (${res.status})`);
      const failures = (j.results ?? []).filter((r: any) => r.status === 'FAIL');
      return [
        `Passed ${j.summary?.passed ?? '?'} / ${j.summary?.total ?? '?'} checks.`,
        ...failures.map((f: any) => `FAIL: ${f.name ?? f.check ?? 'unknown'}: ${f.detail ?? f.error ?? ''}`),
      ].join('\n');
    });

  const runAudit = () =>
    runOp('audit', 'Memory audit', async () => {
      const res = await fetch(API_ENDPOINTS.memory.audit.path, { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `audit failed (${res.status})`);
      const sectors = j.report?.sectors ?? {};
      return Object.entries(sectors)
        .map(([k, v]: [string, any]) => `${k}: ${v.status}${v.provider ? ` (${v.provider})` : ''}${v.error ? ` - ${String(v.error).slice(0, 80)}` : ''}${v.note ? ` - ${v.note}` : ''}`)
        .join('\n') || 'No sectors reported.';
    });

  const runJobs = () => {
    if (!window.confirm('Run the jobs now? This publishes queued output and deletes old rows.')) return;
    return runOp('jobs', 'Jobs run', async () => {
      const res = await fetch(API_ENDPOINTS.jobs.run.path, { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `jobs failed (${res.status})`);
      const q = j.queue ?? {};
      return `Scheduler promoted ${j.scheduler?.processed ?? 0} (reclaimed ${j.scheduler?.reclaimed ?? 0}). Queue: ${q.published ?? 0} published, ${q.duplicates ?? 0} duplicates, ${q.retried ?? 0} retried, ${q.dead ?? 0} dead. Retention: ${j.retention?.deleted ?? j.retention?.removed ?? 0} rows cleaned.`;
    });
  };

  async function toggleChecklist(item: AdminChecklistItem) {
    if (!checklist) return;
    const next = checklist.map((c) => (c.id === item.id ? { ...c, completed: !c.completed } : c));
    setChecklist(next);
    try {
      const res = await fetch(API_ENDPOINTS.admin.checklist.path, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setChecklist(checklist); // roll back optimistic update
      toast.error('Could not save the checklist. Your change was reverted; try again.');
    }
  }

  const done = checklist?.filter((c) => c.completed).length ?? 0;

  return (
    <>
      <AppToastContainer position="bottom-right" theme="light" />
      <M3Page title="Admin console" subtitle="Operations, health and setup. Owner only.">

          <Section title="Operations">
<Card className="overflow-hidden p-0">
            <ListGroup className="rounded-none border-0 bg-transparent">
              <ListRow
                title="Run diagnostics"
                supporting="Checks every subsystem. Read-only."
                trailing={
                  <M3Button onClick={runDiagnostics} disabled={busy !== null} aria-label="Run diagnostics">
                    {busy === 'diagnose' ? 'Running…' : 'Run'}
                  </M3Button>
                }
              />
              <ListRow
                title="Audit memory"
                supporting="Reports on each memory sector. Read-only."
                trailing={
                  <M3Button tone="secondary" onClick={runAudit} disabled={busy !== null} aria-label="Run memory audit">
                    {busy === 'audit' ? 'Running…' : 'Run'}
                  </M3Button>
                }
              />
              <ListRow
                title="Run jobs now"
                supporting="Publishes queued output and cleans old rows. This changes data."
                trailing={
                  <M3Button tone="secondary" onClick={runJobs} disabled={busy !== null} aria-label="Run jobs now">
                    {busy === 'jobs' ? 'Running…' : 'Run'}
                  </M3Button>
                }
              />
            </ListGroup>
            <div role="status" aria-live="polite" className={opResult || busy ? 'border-t border-border-secondary p-4' : ''}>
              {busy !== null && <p className="text-sm text-text-tertiary">Running, this can take a few seconds…</p>}
              {opResult && (
                <div className="rounded-2xl bg-bg-secondary border border-border-secondary p-4">
                  <p className="text-base font-semibold text-text-primary mb-2">{opResult.title.endsWith('failed') ? opResult.title : `${opResult.title} result`}</p>
                  <pre tabIndex={0} aria-label={`${opResult.title} output`} className="max-h-72 overflow-auto text-sm text-text-secondary whitespace-pre-wrap break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{opResult.body}</pre>
                </div>
              )}
            </div>
          </Card>
</Section>

          <Section title="Health" action={<button type="button" onClick={loadHealth} aria-label="Refresh health checks" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Refresh</button>}>
<Card className="overflow-hidden p-0">
            {health === null ? (
              <div className="p-4"><M3State state="loading" message="Checking subsystems…" /></div>
            ) : (
              <>
                <p role="status" className={`px-4 py-3 text-base font-medium ${health.every((r) => r.ok) ? 'text-success' : 'text-danger'}`}>
                  {health.every((r) => r.ok)
                    ? 'All subsystems are healthy.'
                    : `${health.filter((r) => !r.ok).length} of ${health.length} subsystems need attention.`}
                </p>
                <ListGroup className="rounded-none border-0 bg-transparent border-t border-border-secondary" aria-label="Subsystem health">
                  {health.map((row) => (
                    <li key={row.name} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                      <span className="text-base text-text-primary">{row.name}</span>
                      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${row.ok ? 'text-success' : 'text-danger'}`}>
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${row.ok ? 'bg-success' : 'bg-danger'}`} />
                        <span className="sr-only">{row.ok ? 'Healthy: ' : 'Problem: '}</span>{row.status}
                      </span>
                    </li>
                  ))}
                </ListGroup>
              </>
            )}
          </Card>
</Section>

          <Section title={`Setup checklist${checklist ? ` (${done}/${checklist.length})` : ''}`}>
<Card className="overflow-hidden p-0">
            {checklist === null ? (
              <div className="p-4">
                {checklistError ? (
                  <div className="space-y-2">
                    <M3State state="error" message="Could not load the checklist. Sign in as the admin, then try again." />
                    <M3Button tone="secondary" onClick={() => { setChecklistError(false); loadChecklist(); }}>Try again</M3Button>
                  </div>
                ) : (
                  <M3State state="loading" message="Loading checklist…" />
                )}
              </div>
            ) : (
              <ListGroup className="rounded-none border-0 bg-transparent" aria-label="Setup checklist">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={item.completed}
                      onClick={() => toggleChecklist(item)}
                      className="group flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs ${item.completed ? 'bg-text-primary border-text-primary text-bg-primary' : 'border-border-primary text-transparent group-hover:border-text-tertiary'}`}>
                        ✓
                      </span>
                      <span className={`text-base ${item.completed ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>{item.text}</span>
                    </button>
                  </li>
                ))}
              </ListGroup>
            )}
          </Card>
</Section>

          <Section title="Shortcuts">
<Card className="overflow-hidden p-0">
            <ListGroup className="rounded-none border-0 bg-transparent">
              {SHORTCUTS.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-text-primary">{s.label}</span>
                      <span className="block text-sm text-text-tertiary">{s.desc}</span>
                    </span>
                    <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-text-tertiary" />
                  </Link>
                </li>
              ))}
            </ListGroup>
          </Card>
</Section>
      </M3Page>
    </>
  );
}
