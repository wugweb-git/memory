'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AppToastContainer } from '@/app/component/AppToastContainer';
import 'react-toastify/dist/ReactToastify.css';
import { AppShell } from '@/app/component/AppShell';
import { M3Button, M3Card, M3Page, M3State } from '@/components/ui/m3';
import { StatusPill } from '@/components/ui/primitives';
import { apiRequest } from '@/lib/ui/api-client';

type Field = { key: string; label: string; secret: boolean; required: boolean; help: string; source: 'app' | 'env' | null; hint: string | null };
type Account = { platform: string; label: string; note: string; fields: Field[]; ready: boolean };
type Payload = { accounts: Account[]; encryptionReady: boolean };

export default function PublishingAccountsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<Payload>('/api/publishing/accounts'));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load publishing accounts.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(f: Field) {
    const value = (drafts[f.key] ?? '').trim();
    if (!value) { setFieldError((p) => ({ ...p, [f.key]: 'Enter a value first.' })); return; }
    setBusy(f.key);
    setFieldError((p) => ({ ...p, [f.key]: '' }));
    try {
      await apiRequest('/api/publishing/accounts', { method: 'PUT', body: { key: f.key, value }, retries: 0 });
      setDrafts((p) => ({ ...p, [f.key]: '' }));
      toast.success(`${f.label} saved`);
      await load();
    } catch (e: any) {
      setFieldError((p) => ({ ...p, [f.key]: e?.message || 'Could not save.' }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(f: Field) {
    setBusy(f.key);
    try {
      await apiRequest(`/api/publishing/accounts?key=${encodeURIComponent(f.key)}`, { method: 'DELETE', retries: 0 });
      toast.success(`${f.label} removed`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <M3Page title="Publishing accounts" subtitle="Add the tokens that let the app post for you. Values are stored encrypted and are never shown again.">
        {error ? <M3State state="error" message={error} /> : null}
        {!data && !error ? <M3State state="loading" message="Loading accounts" /> : null}
        {data && !data.encryptionReady ? (
          <M3State state="error" message="Tokens can't be saved yet: set MEMORY_ENCRYPTION_KEY (64 hex characters) in Vercel, then reload. IDs can still be saved." />
        ) : null}
        {data?.accounts.map((a) => (
          <M3Card
            key={a.platform}
            title={a.label}
            description={a.note}
            action={a.ready ? <StatusPill tone="success">Ready to post</StatusPill> : <StatusPill tone="warning">Needs setup</StatusPill>}
          >
            <div className="space-y-4">
              {a.fields.map((f) => {
                const id = `cred-${f.key}`;
                const err = fieldError[f.key];
                return (
                  <form key={f.key} className="space-y-2" onSubmit={(e) => { e.preventDefault(); save(f); }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor={id} className="text-sm font-medium text-text-primary">
                        {f.label}{f.required ? '' : ' (optional)'}
                      </label>
                      {f.source ? (
                        <StatusPill tone="success">{(f.source === 'app' ? 'Saved in app' : 'Set in Vercel') + (f.hint ? `, ends in ${f.hint}` : '')}</StatusPill>
                      ) : (
                        <StatusPill tone="neutral">Not set</StatusPill>
                      )}
                    </div>
                    <input
                      id={id}
                      type={f.secret ? 'password' : 'text'}
                      value={drafts[f.key] ?? ''}
                      onChange={(e) => setDrafts((p) => ({ ...p, [f.key]: e.target.value }))}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={f.source ? 'Enter a new value to replace it' : 'Paste here'}
                      aria-describedby={`${id}-help${err ? ` ${id}-err` : ''}`}
                      aria-invalid={err ? true : undefined}
                      className="min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                    <p id={`${id}-help`} className="text-xs text-text-tertiary">{f.help}</p>
                    {err ? <p id={`${id}-err`} role="alert" className="text-xs text-danger">{err}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <M3Button type="submit" loading={busy === f.key} disabled={busy !== null}>Save</M3Button>
                      {f.source === 'app' ? (
                        <M3Button tone="secondary" onClick={() => remove(f)} disabled={busy !== null}>Remove</M3Button>
                      ) : null}
                    </div>
                  </form>
                );
              })}
            </div>
          </M3Card>
        ))}
      </M3Page>
      <AppToastContainer />
    </AppShell>
  );
}
