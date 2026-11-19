'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AppToastContainer } from '@/app/component/AppToastContainer';
import 'react-toastify/dist/ReactToastify.css';
import { AppShell } from '@/app/component/AppShell';
import { M3Button, M3Page, M3State } from '@/components/ui/m3';
import { ListSection } from '../list-parts';
import { StatusPill } from '@/components/ui/primitives';
import { apiRequest } from '@/lib/ui/api-client';

type Field = { key: string; label: string; secret: boolean; required: boolean; help: string; source: 'app' | 'env' | null; hint: string | null };
type Account = { platform: string; label: string; note: string; fields: Field[]; ready: boolean };
type Payload = { accounts: Account[]; encryptionReady: boolean };

export default function IntegrationCredentialsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<Payload>('/api/integrations/credentials'));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load credentials.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(f: Field) {
    const value = (drafts[f.key] ?? '').trim();
    if (!value) { setFieldError((p) => ({ ...p, [f.key]: 'Enter a value first.' })); document.getElementById(`cred-${f.key}`)?.focus(); return; }
    setBusy(f.key);
    setFieldError((p) => ({ ...p, [f.key]: '' }));
    try {
      await apiRequest('/api/integrations/credentials', { method: 'PUT', body: { key: f.key, value }, retries: 0 });
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
      await apiRequest(`/api/integrations/credentials?key=${encodeURIComponent(f.key)}`, { method: 'DELETE', retries: 0 });
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
      <M3Page title="Integration credentials" subtitle="Add the keys that let the app read Notion, Google and Spotify. Secrets are stored encrypted and only the last 4 characters are shown. A saved value wins over the Vercel env var.">
        {error ? <M3State state="error" message={error} /> : null}
        {!data && !error ? <M3State state="loading" message="Loading credentials" /> : null}
        {data && !data.encryptionReady ? (
          <M3State state="error" message="Tokens can't be saved yet: set MEMORY_ENCRYPTION_KEY (64 hex characters) in Vercel, then reload. IDs can still be saved." />
        ) : null}
        {data?.accounts.map((a) => (
          <ListSection
            key={a.platform}
            id={`acct-${a.platform}`}
            title={a.label}
            hint={a.note}
            action={a.ready ? <StatusPill tone="success">Ready</StatusPill> : <StatusPill tone="warning">Needs setup</StatusPill>}
          >
            <div className="space-y-5">
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
                      className="min-h-12 w-full rounded-xl border border-border-primary bg-bg-elevated px-4 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                    <p id={`${id}-help`} className="text-sm text-text-tertiary">{f.help}</p>
                    {err ? <p id={`${id}-err`} role="alert" className="text-sm text-danger">{err}</p> : null}
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
          </ListSection>
        ))}
      </M3Page>
      <AppToastContainer />
    </AppShell>
  );
}
