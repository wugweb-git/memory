'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { M3Button, M3Card, M3Page, M3State } from '@/components/ui/m3';
import { AppShell } from '@/app/component/AppShell';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AdminChecklistItem } from '@/lib/admin/checklist';

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
  { href: '/admin/profile', label: 'Profile admin', desc: 'Public profile internals' },
  { href: '/buffer', label: 'Buffer', desc: 'Intake queue & capture' },
];

export default function AdminConsole() {
  const [health, setHealth] = useState<HealthRow[] | null>(null);
  const [checklist, setChecklist] = useState<AdminChecklistItem[] | null>(null);
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
      if (!res.ok) throw new Error();
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
    } catch {
      setChecklist(null);
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
      toast.error(e instanceof Error ? e.message : `${title} failed`);
    } finally {
      setBusy(null);
    }
  }

  const runDiagnostics = () =>
    runOp('diagnose', 'Diagnostics', async () => {
      const res = await fetch(API_ENDPOINTS.admin.diagnose.path, { method: 'POST', credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'diagnostics failed');
      const failures = (j.results ?? []).filter((r: any) => r.status === 'FAIL');
      return [
        `Passed ${j.summary?.passed ?? '?'} / ${j.summary?.total ?? '?'} checks.`,
        ...failures.map((f: any) => `FAIL — ${f.name ?? f.check ?? 'unknown'}: ${f.detail ?? f.error ?? ''}`),
      ].join('\n');
    });

  const runAudit = () =>
    runOp('audit', 'Memory audit', async () => {
      const res = await fetch(API_ENDPOINTS.memory.audit.path, { credentials: 'include' });
      const j = await res.json();
      const sectors = j.report?.sectors ?? {};
      return Object.entries(sectors)
        .map(([k, v]: [string, any]) => `${k}: ${v.status}${v.provider ? ` (${v.provider})` : ''}${v.error ? ` — ${String(v.error).slice(0, 80)}` : ''}${v.note ? ` — ${v.note}` : ''}`)
        .join('\n') || 'No sectors reported.';
    });

  const runJobs = () =>
    runOp('jobs', 'Jobs run', async () => {
      const res = await fetch(API_ENDPOINTS.jobs.run.path, { credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'jobs failed');
      const q = j.queue ?? {};
      return `Scheduler promoted ${j.scheduler?.processed ?? 0} (reclaimed ${j.scheduler?.reclaimed ?? 0}). Queue: ${q.published ?? 0} published, ${q.duplicates ?? 0} duplicates, ${q.retried ?? 0} retried, ${q.dead ?? 0} dead. Retention: ${j.retention?.deleted ?? j.retention?.removed ?? 0} rows cleaned.`;
    });

  async function toggleChecklist(item: AdminChecklistItem) {
    if (!checklist) return;
    const next = checklist.map((c) => (c.id === item.id ? { ...c, completed: !c.completed } : c));
    setChecklist(next);
    try {
      await fetch(API_ENDPOINTS.admin.checklist.path, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });
    } catch {
      toast.error('Could not save checklist');
    }
  }

  const done = checklist?.filter((c) => c.completed).length ?? 0;

  return (
    <AppShell>
      <ToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Admin console" subtitle="Operations, health and setup — owner only">

          <M3Card title="Operations">
            <div className="flex flex-wrap gap-2">
              <M3Button onClick={runDiagnostics} disabled={busy !== null}>
                {busy === 'diagnose' ? 'Running…' : 'Run diagnostics'}
              </M3Button>
              <M3Button tone="secondary" onClick={runAudit} disabled={busy !== null}>
                {busy === 'audit' ? 'Running…' : 'Memory audit'}
              </M3Button>
              <M3Button tone="secondary" onClick={runJobs} disabled={busy !== null}>
                {busy === 'jobs' ? 'Running…' : 'Run jobs now'}
              </M3Button>
            </div>
            {opResult && (
              <div className="mt-3 rounded-2xl bg-bg-secondary border border-border-secondary p-4">
                <p className="text-2xs font-bold uppercase tracking-widest text-text-tertiary mb-2">{opResult.title}</p>
                <pre className="text-xs text-text-secondary whitespace-pre-wrap">{opResult.body}</pre>
              </div>
            )}
          </M3Card>

          <M3Card
            title="Health"
            action={<button onClick={loadHealth} className="text-2xs font-bold uppercase text-accent">Refresh</button>}
          >
            {health === null ? (
              <M3State state="loading" message="Checking subsystems…" />
            ) : (
              <ul className="divide-y divide-border-secondary">
                {health.map((row) => (
                  <li key={row.name} className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-primary">{row.name}</span>
                    <span className={`inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest ${row.ok ? 'text-success' : 'text-danger'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.ok ? 'bg-success' : 'bg-danger'}`} />
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </M3Card>

          <M3Card title={`Setup checklist${checklist ? ` (${done}/${checklist.length})` : ''}`}>
            {checklist === null ? (
              <M3State state="loading" message="Loading checklist…" />
            ) : (
              <ul className="divide-y divide-border-secondary">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => toggleChecklist(item)}
                      className="w-full flex items-center gap-3 py-2 text-left group"
                    >
                      <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-2xs ${item.completed ? 'bg-text-primary border-text-primary text-bg-primary' : 'border-border-primary text-transparent group-hover:border-text-tertiary'}`}>
                        ✓
                      </span>
                      <span className={`text-sm ${item.completed ? 'text-text-disabled line-through' : 'text-text-primary'}`}>{item.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </M3Card>

          <M3Card title="Shortcuts">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-2xl border border-border-secondary p-4 hover:border-border-primary transition-colors block"
                >
                  <p className="text-sm font-bold text-text-primary">{s.label}</p>
                  <p className="text-2xs text-text-tertiary mt-0.5">{s.desc}</p>
                </Link>
              ))}
            </div>
          </M3Card>
        </M3Page>
      </div>
    </AppShell>
  );
}
